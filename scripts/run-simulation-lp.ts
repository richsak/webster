#!/usr/bin/env bun

import { runSimulation, type SimulationConfig } from "./run-simulation.ts";

export function buildLpSimulationConfig(env: NodeJS.ProcessEnv = process.env): SimulationConfig {
  return {
    substrate: "lp",
    weekCount: 10,
    startDate: env.WEBSTER_SIM_START_DATE ?? "2026-02-01",
    sitePath: "demo-landing-page/ugly",
    contextPath: "demo-landing-page/context",
    outputDir: "demo-output/landing-page",
    seed: env.WEBSTER_SIM_SEED ?? "webster-lp-demo-seed",
    agentSet: "webster-lp-sim",
    memoryStoresPath: "context/memory-stores.json",
    simAgentsPath: "context/sim-agents.json",
    councilCommand:
      env.WEBSTER_SIM_COUNCIL_CMD ?? "bun scripts/run-markdown-bash.ts prompts/sim-council.md",
    skipGit: env.WEBSTER_SIM_SKIP_GIT === "1",
    skipMemorySummaries: env.WEBSTER_SIM_SKIP_MEMORY === "1",
  };
}

export const lpSimulationConfig: SimulationConfig = buildLpSimulationConfig();

if (import.meta.main) {
  runSimulation(lpSimulationConfig).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
