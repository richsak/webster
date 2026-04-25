#!/usr/bin/env bun

import { runSimulation, type SimulationConfig } from "./run-simulation.ts";

export function buildSiteSimulationConfig(env: NodeJS.ProcessEnv = process.env): SimulationConfig {
  return {
    substrate: "site",
    weekCount: 10,
    startDate: env.WEBSTER_SIM_START_DATE ?? "2026-02-01",
    sitePath: "demo-sites/northwest-reno/ugly",
    contextPath: "demo-sites/northwest-reno/context",
    outputDir: "demo-output/northwest-reno",
    seed: env.WEBSTER_SIM_SEED ?? "webster-site-demo-seed",
    agentSet: "webster-site-sim",
    memoryStoresPath: "context/memory-stores.json",
    simAgentsPath: "context/sim-agents.json",
    councilCommand:
      env.WEBSTER_SIM_COUNCIL_CMD ?? "bun scripts/run-markdown-bash.ts prompts/sim-council.md",
    skipGit: env.WEBSTER_SIM_SKIP_GIT === "1",
    skipMemorySummaries: env.WEBSTER_SIM_SKIP_MEMORY === "1",
  };
}

export const siteSimulationConfig: SimulationConfig = buildSiteSimulationConfig();

if (import.meta.main) {
  runSimulation(siteSimulationConfig).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
