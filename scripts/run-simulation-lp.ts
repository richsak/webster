#!/usr/bin/env bun

import { runSimulation, type SimulationConfig } from "./run-simulation.ts";

export const lpSimulationConfig: SimulationConfig = {
  substrate: "lp",
  weekCount: 10,
  startDate: process.env.WEBSTER_SIM_START_DATE ?? "2026-02-01",
  sitePath: "demo-landing-page/ugly",
  contextPath: "demo-landing-page/context",
  outputDir: "demo-output/landing-page",
  seed: process.env.WEBSTER_SIM_SEED ?? "webster-lp-demo-seed",
  agentSet: "webster-lp-sim",
  memoryStoresPath: "context/memory-stores.json",
  simAgentsPath: "context/sim-agents.json",
  councilCommand: process.env.WEBSTER_SIM_COUNCIL_CMD ?? "wbs @prompts/sim-council.md",
  skipGit: process.env.WEBSTER_SIM_SKIP_GIT === "1",
  skipMemorySummaries: process.env.WEBSTER_SIM_SKIP_MEMORY === "1",
};

if (import.meta.main) {
  runSimulation(lpSimulationConfig).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
