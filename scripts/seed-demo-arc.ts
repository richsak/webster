#!/usr/bin/env bun

/**
 * TODO(#51): align memory.jsonl writes with the unified memory substrate helper once story #51 lands.
 * TODO(#47): align proposal.md issue blocks with proposal schema v2 once story #47 lands.
 */

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const DEMO_ARC_DIR = join(ROOT, "history", "demo-arc");
const DEMO_W1 = "demo-W1";
const DEMO_W2 = "demo-W2";
const DEMO_W3 = "demo-W3";
const DEMO_W4 = "demo-W4";
const WEEK_DIRS = [DEMO_W1, DEMO_W2, DEMO_W3, DEMO_W4] as const;

type DemoWeek = (typeof WEEK_DIRS)[number];

type ExperimentKind = "text" | "component" | "asset" | "css";

type VerdictGateStatus = "pass" | "fail" | "improved";

type OutcomeLane =
  | "promote-fast-track"
  | "promote-fallback"
  | "promote-gate-win"
  | "archive-gate-fail"
  | "auto-rollback"
  | "hold";

type PassFailGateStatus = Exclude<VerdictGateStatus, "improved">;

interface MemoryRow {
  ts: string;
  week: string;
  actor: "planner" | "apply" | "visual" | "verdict" | "human";
  event: "promote" | "rollback" | "skip" | "regression" | "gap-detected" | "verdict-ready";
  refs: { baseline_sha?: string; proposal_id?: string; finding_id?: string; exp_id?: string };
  insight: string;
}

interface BaselineRow {
  exp_id: string;
  week: string;
  status: "promoted" | "archived-gate-fail" | "rolled-back";
  baseline_sha: string;
}

interface ExperimentVerdict {
  exp_id: string;
  kind: ExperimentKind;
  reward_delta_pct: number;
  p_value: number;
  gates: {
    brand_voice: VerdictGateStatus;
    bounce_rate: PassFailGateStatus;
    scroll_depth: PassFailGateStatus;
    time_on_page: PassFailGateStatus;
    token_efficiency: PassFailGateStatus;
    heatmap_sanity: PassFailGateStatus;
  };
  classification: "improved" | "hurt" | "neutral";
  outcome: OutcomeLane;
}

interface VerdictJSON {
  week: string;
  experiments: ExperimentVerdict[];
}

interface AgentJSON {
  name: string;
  description: string;
  model: string;
  system: string;
  tools: unknown[];
  mcp_servers?: unknown[];
  metadata?: Record<string, string>;
}

interface NewCriticSpec {
  name: string;
  scope: string;
  description: string;
  rationale: string;
  focus_owned: string[];
  focus_not_owned: string[];
  severity_rubric: string;
}

interface ExperimentSpec extends ExperimentVerdict {
  week: DemoWeek;
}

const ALL_PASS_GATES = {
  brand_voice: "pass",
  bounce_rate: "pass",
  scroll_depth: "pass",
  time_on_page: "pass",
  token_efficiency: "pass",
  heatmap_sanity: "pass",
} as const satisfies ExperimentVerdict["gates"];

const EXPERIMENT_SPECS = [
  {
    week: DEMO_W1,
    exp_id: "exp-01-hero-h1-rewrite",
    kind: "text",
    reward_delta_pct: 15,
    p_value: 0.003,
    gates: ALL_PASS_GATES,
    classification: "improved",
    outcome: "promote-fast-track",
  },
  {
    week: DEMO_W2,
    exp_id: "exp-02-hero-copy-v2",
    kind: "text",
    reward_delta_pct: 8,
    p_value: 0.02,
    gates: ALL_PASS_GATES,
    classification: "improved",
    outcome: "promote-fallback",
  },
  {
    week: DEMO_W2,
    exp_id: "exp-03-cta-button-component",
    kind: "component",
    reward_delta_pct: 12,
    p_value: 0.006,
    gates: ALL_PASS_GATES,
    classification: "improved",
    outcome: "promote-fast-track",
  },
  {
    week: DEMO_W2,
    exp_id: "exp-04-trust-badge-image",
    kind: "asset",
    reward_delta_pct: 0,
    p_value: 1,
    gates: {
      ...ALL_PASS_GATES,
      brand_voice: "improved",
    },
    classification: "neutral",
    outcome: "promote-gate-win",
  },
  {
    week: DEMO_W3,
    exp_id: "exp-05-mid-section-image-swap",
    kind: "asset",
    reward_delta_pct: 10,
    p_value: 0.008,
    gates: {
      ...ALL_PASS_GATES,
      bounce_rate: "fail",
    },
    classification: "improved",
    outcome: "archive-gate-fail",
  },
  {
    week: DEMO_W3,
    exp_id: "exp-06-cta-color-shift",
    kind: "css",
    reward_delta_pct: -11,
    p_value: 0.004,
    gates: ALL_PASS_GATES,
    classification: "hurt",
    outcome: "auto-rollback",
  },
  {
    week: DEMO_W3,
    exp_id: "exp-07-subhead-rewrite",
    kind: "text",
    reward_delta_pct: 4,
    p_value: 0.08,
    gates: ALL_PASS_GATES,
    classification: "neutral",
    outcome: "hold",
  },
  {
    week: DEMO_W4,
    exp_id: "exp-08-hero-safety-copy",
    kind: "text",
    reward_delta_pct: 9,
    p_value: 0.01,
    gates: ALL_PASS_GATES,
    classification: "improved",
    outcome: "promote-fast-track",
  },
  {
    week: DEMO_W4,
    exp_id: "exp-09-cta-size-adjust",
    kind: "css",
    reward_delta_pct: 6,
    p_value: 0.03,
    gates: ALL_PASS_GATES,
    classification: "improved",
    outcome: "promote-fast-track",
  },
] as const satisfies readonly ExperimentSpec[];

function initDemoArcDir(): void {
  rmSync(DEMO_ARC_DIR, { recursive: true, force: true });
  mkdirSync(DEMO_ARC_DIR, { recursive: true });

  for (const week of WEEK_DIRS) {
    mkdirSync(join(DEMO_ARC_DIR, week), { recursive: true });
  }

  mkdirSync(join(DEMO_ARC_DIR, DEMO_W4, "genealogy"), { recursive: true });
  writeFileSync(join(DEMO_ARC_DIR, "baselines.jsonl"), "");
  writeFileSync(join(DEMO_ARC_DIR, "memory.jsonl"), "");
}

function main(): void {
  initDemoArcDir();
  console.log(`Demo arc scaffold seeded (${EXPERIMENT_SPECS.length} experiments).`);
}

if (import.meta.main) {
  main();
}

export {
  DEMO_ARC_DIR,
  DEMO_W1,
  DEMO_W2,
  DEMO_W3,
  DEMO_W4,
  EXPERIMENT_SPECS,
  ROOT,
  initDemoArcDir,
  type AgentJSON,
  type BaselineRow,
  type ExperimentVerdict,
  type MemoryRow,
  type NewCriticSpec,
  type VerdictJSON,
};
