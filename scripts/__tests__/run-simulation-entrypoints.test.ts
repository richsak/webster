import { describe, expect, test } from "bun:test";
import { buildLpSimulationConfig, lpSimulationConfig } from "../run-simulation-lp.ts";
import { buildSiteSimulationConfig, siteSimulationConfig } from "../run-simulation-site.ts";

describe("simulation entrypoint configs", () => {
  test("LP entrypoint targets the Richer Health 10-week simulation", () => {
    expect(lpSimulationConfig).toMatchObject({
      substrate: "lp",
      weekCount: 10,
      sitePath: "demo-landing-page/ugly",
      contextPath: "demo-landing-page/context",
      outputDir: "demo-output/landing-page",
      agentSet: "webster-lp-sim",
      councilCommand: "bun scripts/run-markdown-bash.ts prompts/sim-council.md",
    });
  });

  test("site entrypoint targets the Northwest Reno 10-week simulation", () => {
    expect(siteSimulationConfig).toMatchObject({
      substrate: "site",
      weekCount: 10,
      sitePath: "demo-sites/northwest-reno/ugly",
      contextPath: "demo-sites/northwest-reno/context",
      outputDir: "demo-output/northwest-reno",
      agentSet: "webster-site-sim",
      councilCommand: "bun scripts/run-markdown-bash.ts prompts/sim-council.md",
    });
  });

  test("LP entrypoint honors runtime environment overrides", () => {
    expect(
      buildLpSimulationConfig({
        WEBSTER_SIM_START_DATE: "2026-03-01",
        WEBSTER_SIM_SEED: "override-seed",
        WEBSTER_SIM_COUNCIL_CMD: "bun custom-council.ts",
        WEBSTER_SIM_SKIP_GIT: "1",
        WEBSTER_SIM_SKIP_MEMORY: "1",
      }),
    ).toMatchObject({
      startDate: "2026-03-01",
      seed: "override-seed",
      councilCommand: "bun custom-council.ts",
      skipGit: true,
      skipMemorySummaries: true,
    });
  });

  test("site entrypoint honors runtime environment overrides", () => {
    expect(
      buildSiteSimulationConfig({
        WEBSTER_SIM_START_DATE: "2026-03-08",
        WEBSTER_SIM_SEED: "site-seed",
        WEBSTER_SIM_COUNCIL_CMD: "bun site-council.ts",
        WEBSTER_SIM_SKIP_GIT: "1",
        WEBSTER_SIM_SKIP_MEMORY: "1",
      }),
    ).toMatchObject({
      startDate: "2026-03-08",
      seed: "site-seed",
      councilCommand: "bun site-council.ts",
      skipGit: true,
      skipMemorySummaries: true,
    });
  });
});
