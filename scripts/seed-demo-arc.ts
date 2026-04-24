#!/usr/bin/env bun

/**
 * TODO(#51): align memory.jsonl writes with the unified memory substrate helper once story #51 lands.
 * TODO(#47): align proposal.md issue blocks with proposal schema v2 once story #47 lands.
 */

import { appendFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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

interface DecisionIssue {
  exp_id: string;
  kind: ExperimentKind;
  target_files: string[];
  proposed_change: string;
  expected_outcome_lane: OutcomeLane;
}

interface DecisionJSON {
  week: DemoWeek;
  selected_issues: DecisionIssue[];
  reasoning: string;
  monitor_signal: string;
}

interface ExperimentSpec extends ExperimentVerdict {
  week: DemoWeek;
  target_files: string[];
  proposed_change: string;
  rationale: string;
  baseline_sha: string;
  verdict_ready_insight: string;
  promote_insight: string;
}

const ALL_PASS_GATES = {
  brand_voice: "pass",
  bounce_rate: "pass",
  scroll_depth: "pass",
  time_on_page: "pass",
  token_efficiency: "pass",
  heatmap_sanity: "pass",
} as const satisfies ExperimentVerdict["gates"];

const WEEK_REASONING: Record<DemoWeek, string> = {
  [DEMO_W1]:
    "Cold-start explore-broadly mode surfaced a clear hero-copy win, so the planner selected one text experiment with the strongest first-scroll upside.",
  [DEMO_W2]:
    "Week 1's hero win justified a broader fan-out across text, component, and asset kinds while still keeping the experiments in independent page regions.",
  [DEMO_W3]:
    "Week 2's gains opened room to intentionally push harder on visual and styling changes, even if that increased the risk of overshooting the bounce-rate guardrail.",
  [DEMO_W4]:
    "Week 3 taught the planner to favor conservative tuning, preserve copy clarity, and treat bounce sensitivity as a first-class design constraint.",
};

const WEEK_MONITOR_SIGNALS: Record<DemoWeek, string> = {
  [DEMO_W1]:
    "Cold-start baseline-only analytics showed the hero message was the highest-leverage uncertainty, so the planner kept the opening week to one readable text test.",
  [DEMO_W2]:
    "Hero engagement improved after W1, but trust and CTA interaction remained the next clean surfaces to test in parallel.",
  [DEMO_W3]:
    "Monitor confidence rose after two promoted weeks, so the planner widened scope into higher-variance asset and CSS experiments.",
  [DEMO_W4]:
    "W3 exposed a bounce anomaly on visual changes, so the planner tuned more cautiously and looked for a dedicated bounce-risk critic.",
};

const WEEK_MEMORY_BASE_TIMES: Record<DemoWeek, string> = {
  [DEMO_W1]: "2026-04-01T09:00:00.000Z",
  [DEMO_W2]: "2026-04-08T09:00:00.000Z",
  [DEMO_W3]: "2026-04-15T09:00:00.000Z",
  [DEMO_W4]: "2026-04-22T09:00:00.000Z",
};

const BOUNCE_GUARD_CRITIC_SPEC = {
  name: "bounce-guard-critic",
  scope:
    "Landing-page experiments that lift reward while risking first-session bounce-rate regression.",
  description:
    "Flags visual, CSS, and copy changes that may increase immediate exits even when aggregate reward appears positive.",
  rationale:
    "Week 3 produced a gate-failing image win and a harmful CSS rollback, so Webster needs a dedicated critic for bounce-risk patterns before conservative W4 tuning ships.",
  focus_owned: [
    "bounce-rate guardrail risk",
    "above-the-fold visual aggression",
    "reward-positive but gate-failing experiment patterns",
  ],
  focus_not_owned: [
    "general conversion copy",
    "brand tone",
    "technical SEO",
    "clinical compliance",
  ],
  severity_rubric:
    "P0 when a proposed change repeats a known bounce-rate gate failure; P1 when visual urgency may increase exits; P2 when copy or spacing weakly suggests bounce sensitivity.",
} as const satisfies NewCriticSpec;

const BOUNCE_GUARD_AGENT_JSON = {
  name: "bounce-guard-critic",
  description:
    "Webster critic spawned from W4 genealogy to review bounce-risk regressions before promotion.",
  model: "claude-sonnet-4-6-20260415",
  system:
    "You are Webster's bounce-guard critic. Review proposed landing-page experiments for patterns that can increase bounce rate even when reward metrics improve. Own bounce-rate guardrails only; defer brand, SEO, compliance, and broad conversion concerns to the standing council. Return concise findings with severity, evidence, and a promote/hold/block recommendation.",
  tools: [{ type: "agent_toolset_20260401" }],
  metadata: {
    project: "webster",
    spawned_from: "demo-W4",
    trigger: "W3 bounce-rate gate failure on exp-05-mid-section-image-swap",
    source_spec: "history/demo-arc/demo-W4/genealogy/new-critic-spec.json",
  },
} as const satisfies AgentJSON;

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
    target_files: ["site/src/components/Hero.astro"],
    proposed_change:
      "Rewrite the hero headline and subhead so the first screen states the clinic problem and Webster's promise in one read.",
    rationale:
      "Cold-start week favors the clearest text-only experiment: sharpen the hero promise before testing heavier component or asset changes.",
    baseline_sha: "demo-baseline-exp-01",
    verdict_ready_insight:
      "Hero clarity tested strongest in cold-start mode, so the planner should treat first-scroll messaging as the baseline learning anchor.",
    promote_insight:
      "Promoted exp-01 after a +15% reward lift with all gates passing; hero clarity is now the baseline tone for follow-up experiments.",
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
    target_files: ["site/src/components/Hero.astro"],
    proposed_change:
      "Iterate the promoted hero copy with a tighter operator-facing benefit line while preserving the W1 message structure.",
    rationale:
      "The planner extends the W1 copy win, but treats this as a smaller follow-up test because the first gain already captured the largest readability unlock.",
    baseline_sha: "demo-baseline-exp-02",
    verdict_ready_insight:
      "The second hero-copy variant is ready for verdicting as a sustained, lower-volatility follow-up to the W1 text promotion.",
    promote_insight:
      "Promoted exp-02 on the fallback lane after a +8% reward lift held cleanly across all gates in week 2.",
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
    target_files: ["site/src/components/Nav.astro", "site/src/components/FinalCTA.astro"],
    proposed_change:
      "Refactor the shared CTA button component so primary actions are more visually obvious across nav and closing sections.",
    rationale:
      "Week 2 broadens beyond copy into a shared component experiment that can move click-through without rewriting the page narrative.",
    baseline_sha: "demo-baseline-exp-03",
    verdict_ready_insight:
      "The shared CTA component experiment is ready for verdicting with enough independent signal to judge component-level presentation separately from copy.",
    promote_insight:
      "Promoted exp-03 after a +12% reward lift at p=0.006 with no gate regressions, validating component-level CTA emphasis.",
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
    target_files: ["site/public/assets/trust-badges/demo-trust-strip.png"],
    proposed_change:
      "Swap in a cleaner trust-badge strip that makes the credibility layer feel more on-brand without changing layout or copy.",
    rationale:
      "The planner uses week 2 to test whether a purely visual trust asset can improve perceived credibility even if direct reward stays flat.",
    baseline_sha: "demo-baseline-exp-04",
    verdict_ready_insight:
      "The trust-badge asset experiment is ready for verdicting as a gate-sensitive test where brand voice mattered more than direct CTR movement.",
    promote_insight:
      "Promoted exp-04 through the gate-win lane after reward held flat while brand-voice quality improved without any gate regressions.",
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
    target_files: ["site/public/assets/mid-section/demo-image-v2.png"],
    proposed_change:
      "Replace the mid-page support image with a bolder credibility visual that pushes attention deeper into the offer narrative.",
    rationale:
      "Week 3 intentionally pushes a more aggressive asset test to explore whether stronger visuals can accelerate mid-page engagement.",
    baseline_sha: "demo-baseline-exp-05",
    verdict_ready_insight:
      "The mid-page image swap is ready for verdicting, but it should be judged against bounce sensitivity before any promotion decision.",
    promote_insight:
      "Archived exp-05 as reward-plus-gate-fail after bounce rate regressed even though the experiment lifted reward.",
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
    target_files: ["site/src/styles/tokens.css"],
    proposed_change:
      "Push the CTA color system toward a higher-contrast accent palette to test whether visual urgency alone can lift clicks.",
    rationale:
      "The planner intentionally tests a bolder CSS move in week 3, accepting higher downside risk in exchange for faster learning.",
    baseline_sha: "demo-baseline-exp-06",
    verdict_ready_insight:
      "The CTA color shift is ready for verdicting and should auto-rollback if the downside signal crosses the negative p<0.01 threshold.",
    promote_insight:
      "Rolled back exp-06 automatically after a statistically significant negative reward shift.",
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
    target_files: ["site/src/components/Hero.astro"],
    proposed_change:
      "Tighten the supporting subhead to make the hero promise feel more specific without changing the promoted headline structure.",
    rationale:
      "Week 3 keeps one safer text variant running alongside the bolder asset and CSS tests to preserve a readable control.",
    baseline_sha: "demo-baseline-exp-07",
    verdict_ready_insight:
      "The subhead rewrite is ready for verdicting as a low-risk text follow-up, but the signal may be too weak for promotion.",
    promote_insight:
      "Held exp-07 because the signal was directionally positive but not strong enough to justify a promotion or rollback.",
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
    target_files: ["site/src/components/Hero.astro"],
    proposed_change:
      "Tune the hero copy toward a calmer safety-and-confidence frame in response to week 3's higher-volatility experiments.",
    rationale:
      "Week 4 returns to conservative copy tuning after the W3 overshoot, preserving clarity while reducing bounce risk.",
    baseline_sha: "demo-baseline-exp-08",
    verdict_ready_insight:
      "The safety-copy variant is ready for verdicting as a conservative reset after the week 3 volatility spike.",
    promote_insight:
      "Promoted exp-08 after the calmer hero framing restored a strong positive reward signal with clean gates.",
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
    target_files: ["site/src/styles/components/buttons.css"],
    proposed_change:
      "Reduce CTA size variance so primary actions stay prominent without repeating the bounce-sensitive visual aggression from week 3.",
    rationale:
      "Week 4 keeps CSS changes conservative by tuning scale and spacing rather than color shock or heavy animation.",
    baseline_sha: "demo-baseline-exp-09",
    verdict_ready_insight:
      "The CTA size adjustment is ready for verdicting as a constrained CSS test designed to avoid the W3 bounce failure pattern.",
    promote_insight:
      "Promoted exp-09 after a steady +6% lift confirmed that smaller CSS tuning can still produce safe wins.",
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

function getExperimentsForWeek(week: DemoWeek): ExperimentSpec[] {
  return EXPERIMENT_SPECS.filter((experiment) => experiment.week === week);
}

function appendJsonlRows<T>(path: string, rows: T[]): void {
  appendFileSync(path, rows.map((row) => `${JSON.stringify(row)}\n`).join(""));
}

function appendMemoryRows(rows: MemoryRow[]): void {
  appendJsonlRows(join(DEMO_ARC_DIR, "memory.jsonl"), rows);
}

function appendBaselineRows(rows: BaselineRow[]): void {
  appendJsonlRows(join(DEMO_ARC_DIR, "baselines.jsonl"), rows);
}

function buildProposalMarkdown(week: DemoWeek, experiments: ExperimentSpec[]): string {
  const blocks = experiments
    .map(
      (experiment) =>
        `### ${experiment.exp_id}\n- Kind: \`${experiment.kind}\`\n- Target files:\n${experiment.target_files
          .map((targetFile) => `  - \`${targetFile}\``)
          .join(
            "\n",
          )}\n- Proposed change: ${experiment.proposed_change}\n- Rationale: ${experiment.rationale}`,
    )
    .join("\n\n");

  return `# Demo arc proposal — week ${week}\n\n## Experiments\n\n${blocks}\n`;
}

function writeProposal(week: DemoWeek, experiments: ExperimentSpec[]): void {
  writeFileSync(join(DEMO_ARC_DIR, week, "proposal.md"), buildProposalMarkdown(week, experiments));
}

function writeDecision(week: DemoWeek, experiments: ExperimentSpec[]): void {
  const decision: DecisionJSON = {
    week,
    selected_issues: experiments.map((experiment) => ({
      exp_id: experiment.exp_id,
      kind: experiment.kind,
      target_files: experiment.target_files,
      proposed_change: experiment.proposed_change,
      expected_outcome_lane: experiment.outcome,
    })),
    reasoning: WEEK_REASONING[week],
    monitor_signal: WEEK_MONITOR_SIGNALS[week],
  };

  writeFileSync(
    join(DEMO_ARC_DIR, week, "decision.json"),
    `${JSON.stringify(decision, null, 2)}\n`,
  );
}

function writeVerdict(week: DemoWeek, experiments: ExperimentSpec[]): void {
  const verdict: VerdictJSON = {
    week,
    experiments: experiments.map((experiment) => ({
      exp_id: experiment.exp_id,
      kind: experiment.kind,
      reward_delta_pct: experiment.reward_delta_pct,
      p_value: experiment.p_value,
      gates: experiment.gates,
      classification: experiment.classification,
      outcome: experiment.outcome,
    })),
  };

  writeFileSync(join(DEMO_ARC_DIR, week, "verdict.json"), `${JSON.stringify(verdict, null, 2)}\n`);
}

function getBaselineStatus(experiment: ExperimentSpec): BaselineRow["status"] | null {
  switch (experiment.outcome) {
    case "archive-gate-fail":
      return "archived-gate-fail";
    case "auto-rollback":
      return "rolled-back";
    case "hold":
      return null;
    case "promote-fast-track":
    case "promote-fallback":
    case "promote-gate-win":
      return "promoted";
  }
}

function buildBaselineRows(experiments: ExperimentSpec[]): BaselineRow[] {
  return experiments.flatMap((experiment) => {
    const status = getBaselineStatus(experiment);

    if (status === null) {
      return [];
    }

    return [
      {
        exp_id: experiment.exp_id,
        week: experiment.week,
        status,
        baseline_sha: experiment.baseline_sha,
      },
    ];
  });
}

function getFinalMemoryEvent(experiment: ExperimentSpec): MemoryRow["event"] {
  switch (experiment.outcome) {
    case "archive-gate-fail":
      return "regression";
    case "auto-rollback":
      return "rollback";
    case "hold":
      return "skip";
    case "promote-fast-track":
    case "promote-fallback":
    case "promote-gate-win":
      return "promote";
  }
}

function buildWeekMemoryRows(week: DemoWeek, experiments: ExperimentSpec[]): MemoryRow[] {
  const baseTimestamp = Date.parse(WEEK_MEMORY_BASE_TIMES[week]);

  return experiments.flatMap((experiment, index) => {
    const verdictReadyTimestamp = new Date(baseTimestamp + index * 2 * 60_000).toISOString();
    const finalTimestamp = new Date(baseTimestamp + (index * 2 + 1) * 60_000).toISOString();
    const baselineStatus = getBaselineStatus(experiment);
    const finalRefs =
      baselineStatus === null
        ? { exp_id: experiment.exp_id }
        : { exp_id: experiment.exp_id, baseline_sha: experiment.baseline_sha };

    return [
      {
        ts: verdictReadyTimestamp,
        week,
        actor: "verdict",
        event: "verdict-ready",
        refs: { exp_id: experiment.exp_id },
        insight: experiment.verdict_ready_insight,
      },
      {
        ts: finalTimestamp,
        week,
        actor: "verdict",
        event: getFinalMemoryEvent(experiment),
        refs: finalRefs,
        insight: experiment.promote_insight,
      },
    ];
  });
}

function buildW4GenealogyMemoryRow(): MemoryRow {
  return {
    ts: new Date(Date.parse(WEEK_MEMORY_BASE_TIMES[DEMO_W4]) - 1 * 60_000).toISOString(),
    week: DEMO_W4,
    actor: "planner",
    event: "gap-detected",
    refs: {
      exp_id: "exp-05-mid-section-image-swap",
      finding_id: "bounce-guard-critic",
    },
    insight:
      "W3 reward-positive asset test failed the bounce_rate gate, so W4 spawned bounce-guard-critic before approving conservative safety-copy and CTA-size experiments.",
  };
}

function writeW4GenealogyArtifacts(): void {
  const genealogyDir = join(DEMO_ARC_DIR, DEMO_W4, "genealogy");

  writeFileSync(
    join(genealogyDir, "new-critic-spec.json"),
    `${JSON.stringify(BOUNCE_GUARD_CRITIC_SPEC, null, 2)}\n`,
  );
  writeFileSync(
    join(genealogyDir, "agent-registration.json"),
    `${JSON.stringify(BOUNCE_GUARD_AGENT_JSON, null, 2)}\n`,
  );
}

function writeW1(): void {
  const experiments = getExperimentsForWeek(DEMO_W1);
  writeProposal(DEMO_W1, experiments);
  writeDecision(DEMO_W1, experiments);
  writeVerdict(DEMO_W1, experiments);
  appendBaselineRows(buildBaselineRows(experiments));
  appendMemoryRows(buildWeekMemoryRows(DEMO_W1, experiments));
}

function writeW2(): void {
  const experiments = getExperimentsForWeek(DEMO_W2);
  writeProposal(DEMO_W2, experiments);
  writeDecision(DEMO_W2, experiments);
  writeVerdict(DEMO_W2, experiments);
  appendBaselineRows(buildBaselineRows(experiments));
  appendMemoryRows(buildWeekMemoryRows(DEMO_W2, experiments));
}

function writeW3(): void {
  const experiments = getExperimentsForWeek(DEMO_W3);
  writeProposal(DEMO_W3, experiments);
  writeDecision(DEMO_W3, experiments);
  writeVerdict(DEMO_W3, experiments);
  appendBaselineRows(buildBaselineRows(experiments));
  appendMemoryRows(buildWeekMemoryRows(DEMO_W3, experiments));
}

function writeW4(): void {
  const experiments = getExperimentsForWeek(DEMO_W4);
  writeProposal(DEMO_W4, experiments);
  writeDecision(DEMO_W4, experiments);
  writeVerdict(DEMO_W4, experiments);
  writeW4GenealogyArtifacts();
  appendBaselineRows(buildBaselineRows(experiments));
  appendMemoryRows([buildW4GenealogyMemoryRow(), ...buildWeekMemoryRows(DEMO_W4, experiments)]);
}

function main(): void {
  initDemoArcDir();
  writeW1();
  writeW2();
  writeW3();
  writeW4();
  console.log("Demo arc seeded through demo-W4.");
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
  BOUNCE_GUARD_AGENT_JSON,
  BOUNCE_GUARD_CRITIC_SPEC,
  EXPERIMENT_SPECS,
  ROOT,
  appendBaselineRows,
  appendMemoryRows,
  getExperimentsForWeek,
  initDemoArcDir,
  writeDecision,
  writeProposal,
  writeVerdict,
  writeW3,
  writeW4,
  type AgentJSON,
  type BaselineRow,
  type DecisionJSON,
  type ExperimentVerdict,
  type MemoryRow,
  type NewCriticSpec,
  type VerdictJSON,
};
