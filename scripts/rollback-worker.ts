#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExperimentVerdict } from "./verdict-engine";

export interface RollbackPlan {
  exp_id: string;
  experiment_sha: string;
  command: string[];
  draft_pr: true;
  evidence_path: string;
  touches_co_shipped_winners: false;
}

export function buildRollbackPlan(
  week: string,
  verdict: ExperimentVerdict,
  experimentSha: string,
): RollbackPlan | undefined {
  if (verdict.lane !== "auto-rollback") {
    return undefined;
  }
  return {
    exp_id: verdict.exp_id,
    experiment_sha: experimentSha,
    command: ["git", "revert", experimentSha],
    draft_pr: true,
    evidence_path: join("history", week, `rollback-${verdict.exp_id}.md`),
    touches_co_shipped_winners: false,
  };
}

export function writeRollbackEvidence(
  path: string,
  verdict: ExperimentVerdict,
  experimentSha: string,
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    [
      `# Rollback evidence — ${verdict.exp_id}`,
      "",
      `Experiment SHA: ${experimentSha}`,
      `Lane: ${verdict.lane}`,
      `Reward delta: ${verdict.reward_delta}`,
      `Confidence: ${verdict.confidence}`,
      "",
      "## Gate status",
      ...verdict.gate_status.map(
        (gate) =>
          `- ${gate.gate}: ${gate.passed ? "PASS" : "FAIL"}${gate.delta === undefined ? "" : ` (${gate.delta})`}`,
      ),
      "",
      "Draft PR required so Richie can override before merge.",
      "Does not touch co-shipped winners; reverts only the experiment commit SHA above.",
      "",
    ].join("\n"),
  );
}
