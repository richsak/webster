import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  captureLocalScreenshots,
  runSimulation,
  type SimulationConfig,
} from "../run-simulation.ts";

function config(outputDir: string): SimulationConfig {
  return {
    substrate: "lp",
    weekCount: 1,
    startDate: "2026-02-01",
    sitePath: "demo-landing-page/ugly",
    contextPath: "demo-landing-page/context",
    outputDir,
    seed: "fixed-sim-seed",
    agentSet: "webster-lp-sim",
    memoryStoresPath: "context/memory-stores.json",
    simAgentsPath: "context/sim-agents.json",
    skipGit: true,
    skipMemorySummaries: true,
  };
}

describe("runSimulation", () => {
  test("runs a 2-week loop with mocked council and deterministic heads", async () => {
    const outDirA = mkdtempSync(join(tmpdir(), "webster-run-sim-a-"));
    const outDirB = mkdtempSync(join(tmpdir(), "webster-run-sim-b-"));
    const originalReview = process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW;
    process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW = "0";
    const councilCalls: Record<string, string>[] = [];
    const deps = {
      runCouncil: (env: Record<string, string>) => {
        councilCalls.push(env);
      },
      captureScreenshots: async (_siteDir: string, outDir: string) => {
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, "mock-screenshot.txt"), "mock screenshot\n");
        return [outDir];
      },
      writeMemorySummary: async () => {
        await Promise.resolve();
      },
    };

    let firstHeads: string[];
    let secondHeads: string[];
    try {
      firstHeads = await runSimulation(config(outDirA), deps);
      secondHeads = await runSimulation(config(outDirB), deps);
    } finally {
      if (originalReview === undefined) {
        delete process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW;
      } else {
        process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW = originalReview;
      }
    }

    expect(firstHeads).toEqual(secondHeads);
    expect(firstHeads).toHaveLength(2);
    expect(councilCalls[0]).toMatchObject({
      SUBSTRATE: "lp",
      WEEK_DATE: "2026-02-01",
      BRANCH: "demo-sim-lp/w00",
      AGENT_SET: "webster-lp-sim",
    });
    expect(councilCalls[1]?.BRANCH).toBe("demo-sim-lp/w01");
    expect(existsSync(join(outDirA, "week-00/history/analytics.json"))).toBe(true);
    expect(existsSync(join(outDirA, "week-01/week-summary.json"))).toBe(true);
  });

  test("screenshot capture writes browser-audit artifacts for file URLs or fallback summary", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "webster-run-sim-shots-"));

    const dirs = await captureLocalScreenshots("demo-landing-page/ugly", outDir);

    expect(dirs).toEqual([join(outDir, "index")]);
    expect(existsSync(join(outDir, "index/summary.json"))).toBe(true);
    const summary = JSON.parse(readFileSync(join(outDir, "index/summary.json"), "utf8")) as {
      url: string;
      breakpoints: unknown[];
    };
    expect(summary.url).toContain("file://");
    expect(summary.breakpoints).toHaveLength(3);
  });
});
