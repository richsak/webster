import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRollbackPlan, writeRollbackEvidence } from "../rollback-worker";
import type { ExperimentVerdict } from "../verdict-engine";

const verdict: ExperimentVerdict = {
  exp_id: "exp-01-hero",
  verdict: "rollback",
  confidence: 0.92,
  reward_delta: -0.04,
  gate_status: [{ gate: "bounce-ceiling", passed: false, delta: 10 }],
  lane: "auto-rollback",
};

describe("rollback worker", () => {
  test("builds a specific experiment-sha revert plan", () => {
    expect(buildRollbackPlan("2026-04-24", verdict, "abc123")).toEqual({
      exp_id: "exp-01-hero",
      experiment_sha: "abc123",
      command: ["git", "revert", "abc123"],
      draft_pr: true,
      evidence_path: "history/2026-04-24/rollback-exp-01-hero.md",
      touches_co_shipped_winners: false,
    });
  });

  test("ignores non-auto-rollback verdicts", () => {
    expect(
      buildRollbackPlan("2026-04-24", { ...verdict, lane: "hold", verdict: "hold" }, "abc123"),
    ).toBeUndefined();
  });

  test("writes rollback evidence", () => {
    const dir = mkdtempSync(join(tmpdir(), "rollback-"));
    const path = join(dir, "history/2026-04-24/rollback-exp-01-hero.md");
    try {
      writeRollbackEvidence(path, verdict, "abc123");
      expect(existsSync(path)).toBe(true);
      expect(readFileSync(path, "utf8")).toContain("Experiment SHA: abc123");
      expect(readFileSync(path, "utf8")).toContain("Draft PR required");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
