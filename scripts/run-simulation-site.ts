#!/usr/bin/env bun

import { runSimulation, type SimulationConfig } from "./run-simulation.ts";

export const siteSimulationConfig: SimulationConfig = {
  substrate: "site",
  weekCount: 10,
  startDate: process.env.WEBSTER_SIM_START_DATE ?? "2026-02-01",
  sitePath: "demo-sites/northwest-reno/ugly",
  contextPath: "demo-sites/northwest-reno/context",
  outputDir: "demo-output/northwest-reno",
  seed: process.env.WEBSTER_SIM_SEED ?? "webster-site-demo-seed",
  agentSet: "webster-site-sim",
  memoryStoresPath: "context/memory-stores.json",
  simAgentsPath: "context/sim-agents.json",
  councilCommand: process.env.WEBSTER_SIM_COUNCIL_CMD ?? "wbs @prompts/sim-council.md",
  skipGit: process.env.WEBSTER_SIM_SKIP_GIT === "1",
  skipMemorySummaries: process.env.WEBSTER_SIM_SKIP_MEMORY === "1",
};

if (import.meta.main) {
  runSimulation(siteSimulationConfig).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
