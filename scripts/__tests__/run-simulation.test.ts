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
      CONTEXT_PATH: "demo-landing-page/context",
      SITE_PATH: "demo-landing-page/ugly",
      MEMORY_STORES_JSON: "context/memory-stores.json",
      SIM_AGENTS_JSON: "context/sim-agents.json",
    });
    expect(councilCalls[1]?.BRANCH).toBe("demo-sim-lp/w01");
    for (const week of ["00", "01"]) {
      expect(existsSync(join(outDirA, `week-${week}/history/analytics.json`))).toBe(true);
      expect(existsSync(join(outDirA, `week-${week}/history/analytics-reasoning.md`))).toBe(true);
      expect(existsSync(join(outDirA, `week-${week}/screenshots/mock-screenshot.txt`))).toBe(true);
      expect(existsSync(join(outDirA, `week-${week}/week-summary.json`))).toBe(true);
    }
  });

  test("writes role-specific memory summaries for council, planner, and redesigner", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "webster-run-sim-memory-"));
    const memoryPath = join(outDir, "memory-stores.json");
    writeFileSync(
      memoryPath,
      JSON.stringify({
        lp: { council: "mem_council", planner: "mem_planner", redesigner: "mem_redesigner" },
      }),
    );
    const originalKey = process.env.ANTHROPIC_API_KEY;
    const originalReview = process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW;
    const originalFetch = globalThis.fetch;
    const bodies: { text: string; metadata: { role: string } }[] = [];
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW = "0";
    globalThis.fetch = (async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)) as { text: string; metadata: { role: string } });
      return new Response(JSON.stringify({ id: "doc" }), { status: 200 });
    }) as typeof fetch;

    try {
      await runSimulation(
        {
          ...config(outDir),
          weekCount: 0,
          memoryStoresPath: memoryPath,
          skipMemorySummaries: false,
        },
        {
          runCouncil: () => {
            bodies.length += 0;
          },
          captureScreenshots: async (_siteDir, shotDir) => {
            mkdirSync(shotDir, { recursive: true });
            return [shotDir];
          },
        },
      );
      expect(bodies.map((body) => body.metadata.role)).toEqual([
        "council",
        "planner",
        "redesigner",
      ]);
      expect(bodies[0]?.text).toContain("council memory");
      expect(bodies[1]?.text).toContain("planner memory");
      expect(bodies[2]?.text).toContain("redesigner memory");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
      if (originalReview === undefined) {
        delete process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW;
      } else {
        process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW = originalReview;
      }
    }
  });

  test("site screenshot capture covers all three Northwest Reno pages", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "webster-run-sim-site-shots-"));
    const originalDisable = process.env.WEBSTER_BROWSER_AUDIT_DISABLE_PLAYWRIGHT;
    process.env.WEBSTER_BROWSER_AUDIT_DISABLE_PLAYWRIGHT = "1";

    let dirs: string[];
    try {
      dirs = await captureLocalScreenshots("demo-sites/northwest-reno/ugly", outDir);
    } finally {
      if (originalDisable === undefined) {
        delete process.env.WEBSTER_BROWSER_AUDIT_DISABLE_PLAYWRIGHT;
      } else {
        process.env.WEBSTER_BROWSER_AUDIT_DISABLE_PLAYWRIGHT = originalDisable;
      }
    }

    expect(dirs).toEqual([
      join(outDir, "index"),
      join(outDir, "services"),
      join(outDir, "free-estimate"),
    ]);
    for (const dir of dirs) {
      expect(existsSync(join(dir, "summary.json"))).toBe(true);
      const summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8")) as {
        url: string;
        breakpoints: unknown[];
      };
      expect(summary.url).toContain("file://");
      expect(summary.breakpoints).toHaveLength(3);
      expect(existsSync(join(dir, "a11y-text.txt"))).toBe(true);
    }
  });

  test("screenshot capture writes browser-audit artifacts for file URLs or fallback summary", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "webster-run-sim-shots-"));

    const dirs = await captureLocalScreenshots("demo-landing-page/ugly", outDir);

    expect(dirs).toEqual([join(outDir, "index")]);
    expect(existsSync(join(outDir, "index/summary.json"))).toBe(true);
    const summary = JSON.parse(readFileSync(join(outDir, "index/summary.json"), "utf8")) as {
      url: string;
      breakpoints: unknown[];
      screenshot_capture_unavailable?: string;
    };
    expect(summary.url).toContain("file://");
    expect(summary.breakpoints).toHaveLength(3);
    if (!("screenshot_capture_unavailable" in summary)) {
      expect(existsSync(join(outDir, "index/mobile.png"))).toBe(true);
      expect(existsSync(join(outDir, "index/tablet.png"))).toBe(true);
      expect(existsSync(join(outDir, "index/desktop.png"))).toBe(true);
    }
  });
});
