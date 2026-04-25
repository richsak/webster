import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, type MemoryEvent } from "../memory.ts";
import { appendColdStartOriginEvent, marshalPlannerContext } from "../planner-context.ts";

function buildTmpDir(testName: string): string {
  return join(tmpdir(), `planner-context-${testName}-${Date.now()}-${randomUUID()}`);
}

function createEvent(index: number): MemoryEvent {
  return {
    ts: `2026-04-23T00:00:${index.toString().padStart(2, "0")}.000Z`,
    week: "2026-W17",
    actor: "planner",
    event: "verdict-ready",
    refs: { plan: `history/2026-W17/plan-${index}.md` },
    insight: `event-${index}`,
  };
}

describe("marshalPlannerContext", () => {
  test("uses the memory tail helper with custom tailN", () => {
    const root = buildTmpDir("tail-wiring");
    const memoryPath = join(root, "history", "memory.jsonl");

    try {
      for (const index of [1, 2, 3]) {
        appendEvent(createEvent(index), memoryPath);
      }

      const context = marshalPlannerContext({
        memoryPath,
        verdictDir: join(root, "history"),
        monitorPath: join(root, "monitor.md"),
        tailN: 2,
      });

      expect(context.startsWith("## MEMORY_TAIL")).toBe(true);
      expect(context).not.toContain("event-1");
      expect(context).toContain("event-2");
      expect(context).toContain("event-3");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("reads the two most recent verdicts in descending week order", () => {
    const root = buildTmpDir("verdicts");
    const historyDir = join(root, "history");

    try {
      for (const week of ["2026-W15", "2026-W16", "2026-W17"]) {
        mkdirSync(join(historyDir, week), { recursive: true });
        writeFileSync(join(historyDir, week, "verdict.json"), JSON.stringify({ week }));
      }

      const context = marshalPlannerContext({
        memoryPath: join(historyDir, "memory.jsonl"),
        verdictDir: historyDir,
        monitorPath: join(root, "monitor.md"),
      });
      const w17Index = context.indexOf("### 2026-W17");
      const w16Index = context.indexOf("### 2026-W16");

      expect(w17Index).toBeGreaterThan(-1);
      expect(w16Index).toBeGreaterThan(w17Index);
      expect(context).not.toContain("### 2026-W15");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("skips missing verdict and monitor files without throwing", () => {
    const root = buildTmpDir("missing-files");
    const historyDir = join(root, "history");

    try {
      mkdirSync(join(historyDir, "2026-W17"), { recursive: true });

      const context = marshalPlannerContext({
        memoryPath: join(historyDir, "memory.jsonl"),
        verdictDir: historyDir,
        monitorPath: join(root, "missing-monitor.md"),
      });

      expect(context).toContain("## RECENT_VERDICTS\nNo recent verdicts found.");
      expect(context).toContain("## MONITOR_ANOMALIES\nNo monitor anomalies found.");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("labels cold start when all inputs are empty or missing", () => {
    const root = buildTmpDir("cold-start");

    try {
      const context = marshalPlannerContext({
        memoryPath: join(root, "missing-memory.jsonl"),
        verdictDir: join(root, "missing-history"),
        monitorPath: join(root, "missing-monitor.md"),
      });

      expect(context).toContain('direction_hint="broad exploration, baseline-only analytics"');
      expect(context).toContain("direction_hint: broad exploration, baseline-only analytics");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("writes a cold-start origin event row", () => {
    const root = buildTmpDir("origin-event");
    const memoryPath = join(root, "history", "memory.jsonl");

    try {
      appendColdStartOriginEvent("2026-W17", memoryPath);
      expect(readFileSync(memoryPath, "utf8")).toContain('"event":"origin"');
      expect(readFileSync(memoryPath, "utf8")).toContain("broad exploration");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
