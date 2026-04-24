import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendBaselineRow,
  parseBaselineRow,
  planBaselinePromotion,
  readBaselineRows,
  writeBaselinePromotionEvent,
} from "../baselines";

describe("per-experiment baselines", () => {
  const row = {
    exp_id: "exp-01-hero",
    week: "2026-04-24",
    version_sha: "abc123",
    experiment_sha: "def456",
    proposal_ref: "history/2026-04-24/proposal.md#issue-1",
    decision_ref: "history/2026-04-24/decision.json#selected_issues/0",
    baseline_window: "2026-04-24..2026-05-01",
    status: "holding" as const,
  };

  test("accepts locked status vocabulary plus skipped-*", () => {
    expect(parseBaselineRow(row).status).toBe("holding");
    expect(parseBaselineRow({ ...row, status: "promoted" }).status).toBe("promoted");
    expect(parseBaselineRow({ ...row, status: "skipped-visual-veto" }).status).toBe(
      "skipped-visual-veto",
    );
  });

  test("rejects unknown status values", () => {
    expect(() => parseBaselineRow({ ...row, status: "maybe" })).toThrow("Invalid baseline status");
  });

  test("plans promotion after sustained promoted windows", () => {
    expect(
      planBaselinePromotion(
        [
          { ...row, version_sha: "old", status: "promoted" },
          { ...row, version_sha: "new", status: "promoted" },
        ],
        "exp-01-hero",
      ),
    ).toEqual({
      exp_id: "exp-01-hero",
      promoted_sha: "new",
      archived_sha: "old",
      sustained_weeks: 2,
      event: "promote",
    });
    expect(planBaselinePromotion([{ ...row, status: "promoted" }], "exp-01-hero")).toBeUndefined();
  });

  test("appends promotion events", () => {
    const dir = mkdtempSync(join(tmpdir(), "baseline-events-"));
    const path = join(dir, "history/memory.jsonl");
    try {
      writeBaselinePromotionEvent(path, {
        exp_id: "exp-01-hero",
        promoted_sha: "new",
        archived_sha: "old",
        sustained_weeks: 2,
        event: "promote",
      });
      const promotionRow = JSON.parse(readFileSync(path, "utf8"));
      expect(promotionRow).toMatchObject({
        exp_id: "exp-01-hero",
        promoted_sha: "new",
        archived_sha: "old",
        sustained_weeks: 2,
        event: "promote",
        actor: "baseline-promoter",
      });
      expect(new Date(promotionRow.ts).getTime()).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("appends and reads jsonl rows", () => {
    const dir = mkdtempSync(join(tmpdir(), "baselines-"));
    const path = join(dir, "history/baselines.jsonl");
    try {
      appendBaselineRow(path, row);
      appendBaselineRow(path, { ...row, exp_id: "exp-02-copy", status: "promoted" });
      expect(readBaselineRows(path)).toEqual([
        row,
        { ...row, exp_id: "exp-02-copy", status: "promoted" },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
