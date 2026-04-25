#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  generateSyntheticAnalytics,
  requestOpusReview,
  type AnalyticsJson,
  type SyntheticAnalyticsInput,
} from "./synthetic-analytics.ts";

const API_BASE = process.env.ANTHROPIC_API_BASE ?? "https://api.anthropic.com";
const API = `${API_BASE.replace(/\/$/, "")}/v1`;
const VERSION = "2023-06-01";
const BETA = "managed-agents-2026-04-01";

export interface SimulationConfig {
  substrate: "lp" | "site";
  weekCount: number;
  startDate: string;
  sitePath: string;
  contextPath: string;
  outputDir: string;
  seed: string;
  agentSet: "webster-lp-sim" | "webster-site-sim";
  memoryStoresPath: string;
  simAgentsPath: string;
  councilCommand?: string;
  skipGit?: boolean;
  skipMemorySummaries?: boolean;
}

interface RunDeps {
  runCommand?: (
    command: string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ) => void;
  runCouncil?: (env: Record<string, string>) => void | Promise<void>;
  captureScreenshots?: (siteDir: string, outDir: string) => Promise<string[]>;
  writeMemorySummary?: (
    config: SimulationConfig,
    week: number,
    analytics: AnalyticsJson,
  ) => Promise<void>;
}

function weekLabel(week: number): string {
  return `w${String(week).padStart(2, "0")}`;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function substrateHistoryName(substrate: "lp" | "site"): string {
  return `${substrate}-demo`;
}

function defaultRunCommand(
  command: string[],
  options?: { cwd?: string; env?: Record<string, string> },
): void {
  execFileSync(command[0] ?? "", command.slice(1), {
    cwd: options?.cwd,
    env: { ...process.env, ...options?.env },
    stdio: "inherit",
  });
}

function defaultRunCouncil(
  env: Record<string, string>,
  command = "wbs @prompts/sim-council.md",
): void {
  execFileSync("bash", ["-lc", command], { env: { ...process.env, ...env }, stdio: "inherit" });
}

function fileUrl(path: string): string {
  return `file://${resolve(path)}`;
}

function pagesForSite(siteDir: string): string[] {
  return ["index.html", "services.html", "free-estimate.html"]
    .map((file) => join(siteDir, file))
    .filter((file) => existsSync(file));
}

export async function captureLocalScreenshots(siteDir: string, outDir: string): Promise<string[]> {
  mkdirSync(outDir, { recursive: true });
  const outputs: string[] = [];
  for (const pagePath of pagesForSite(siteDir)) {
    const pageOutDir = join(outDir, basename(pagePath, ".html"));
    mkdirSync(pageOutDir, { recursive: true });
    const result = Bun.spawnSync(
      ["bun", "scripts/browser-audit.ts", fileUrl(pagePath), "--out", pageOutDir],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `browser audit failed for ${pagePath}: ${new TextDecoder().decode(result.stderr)}`,
      );
    }
    outputs.push(pageOutDir);
  }
  return outputs;
}

function getAPIKey(): string | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  try {
    const key = execFileSync(
      "security",
      ["find-generic-password", "-s", "anthropic-webster", "-a", process.env.USER ?? "", "-w"],
      { encoding: "utf8" },
    ).trim();
    return key || null;
  } catch {
    return null;
  }
}

async function defaultWriteMemorySummary(
  config: SimulationConfig,
  week: number,
  analytics: AnalyticsJson,
): Promise<void> {
  if (config.skipMemorySummaries) {
    return;
  }
  const apiKey = getAPIKey();
  if (!apiKey) {
    return;
  }
  const stores = JSON.parse(readFileSync(config.memoryStoresPath, "utf8")) as Record<
    string,
    Record<string, string>
  >;
  const substrateStores = stores[config.substrate];
  if (!substrateStores) {
    throw new Error(`missing memory stores for substrate ${config.substrate}`);
  }
  const ctaClicks = Object.values(analytics.cta_clicks).reduce((sum, value) => sum + value, 0);
  const summaries = {
    council: `Week ${weekLabel(week)} ${config.substrate} council memory: synthetic panel saw sessions=${analytics.sessions}, bounce=${analytics.bounce_rate}, cta_clicks=${ctaClicks}; use this as shared context for critic weighting.`,
    planner: `Week ${weekLabel(week)} ${config.substrate} planner memory: site_signature=${analytics.site_signature}, scroll75=${analytics.scroll_depth_75}, cta_clicks=${ctaClicks}; compare against prior week before choosing promote/hold/retry/explore.`,
    redesigner: `Week ${weekLabel(week)} ${config.substrate} redesigner memory: strongest visible outcome signal is bounce=${analytics.bounce_rate} with avg_time_s=${analytics.avg_time_s}; propose changes that improve this without violating brand context.`,
  } satisfies Record<"council" | "planner" | "redesigner", string>;
  for (const role of ["council", "planner", "redesigner"] as const) {
    const storeId = substrateStores[role];
    if (!storeId) {
      continue;
    }
    await fetch(`${API}/memory_stores/${storeId}/documents`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": VERSION,
        "anthropic-beta": BETA,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text: summaries[role],
        metadata: {
          substrate: config.substrate,
          week: weekLabel(week),
          role,
          source: "run-simulation",
        },
      }),
    });
  }
}

function prepareBranch(
  config: SimulationConfig,
  week: number,
  runCommand: NonNullable<RunDeps["runCommand"]>,
): string {
  const branch = `demo-sim-${config.substrate}/${weekLabel(week)}`;
  if (config.skipGit) {
    return branch;
  }
  if (week === 0) {
    runCommand(["git", "checkout", "-B", branch]);
  } else {
    runCommand([
      "git",
      "checkout",
      "-B",
      branch,
      `demo-sim-${config.substrate}/${weekLabel(week - 1)}`,
    ]);
  }
  return branch;
}

function copyArtifacts(sourceDir: string, targetDir: string): void {
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(dirname(targetDir), { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
}

export async function runSimulation(
  config: SimulationConfig,
  deps: RunDeps = {},
): Promise<string[]> {
  const runCommand = deps.runCommand ?? defaultRunCommand;
  const runCouncil = deps.runCouncil ?? ((env) => defaultRunCouncil(env, config.councilCommand));
  const captureScreenshots = deps.captureScreenshots ?? captureLocalScreenshots;
  const writeMemorySummary = deps.writeMemorySummary ?? defaultWriteMemorySummary;
  const heads: string[] = [];
  let previousAnalytics: AnalyticsJson | undefined;

  for (let week = 0; week <= config.weekCount; week++) {
    const label = weekLabel(week);
    const weekDate = addDays(config.startDate, week * 7);
    const branch = prepareBranch(config, week, runCommand);
    const historyDir = join("history", substrateHistoryName(config.substrate), label);
    const outputWeekDir = join(config.outputDir, `week-${label.slice(1)}`);
    mkdirSync(historyDir, { recursive: true });
    mkdirSync(outputWeekDir, { recursive: true });

    const analyticsInput: SyntheticAnalyticsInput = {
      substrate: config.substrate,
      week,
      weekDate,
      sitePath: config.sitePath,
      contextPath: config.contextPath,
      previousAnalytics,
      seed: config.seed,
    };
    const analyticsOutput = generateSyntheticAnalytics(analyticsInput);
    await requestOpusReview(analyticsInput, analyticsOutput);
    writeFileSync(
      join(historyDir, "analytics.json"),
      `${JSON.stringify(analyticsOutput.analytics, null, 2)}\n`,
    );
    writeFileSync(join(historyDir, "analytics-reasoning.md"), `${analyticsOutput.reasoning}\n`);

    await runCouncil({
      SUBSTRATE: config.substrate,
      WEEK_DATE: weekDate,
      BRANCH: branch,
      AGENT_SET: config.agentSet,
      CONTEXT_PATH: config.contextPath,
      SITE_PATH: config.sitePath,
      MEMORY_STORES_JSON: config.memoryStoresPath,
      SIM_AGENTS_JSON: config.simAgentsPath,
    });

    const screenshotDirs = await captureScreenshots(
      config.sitePath,
      join(outputWeekDir, "screenshots"),
    );
    await writeMemorySummary(config, week, analyticsOutput.analytics);
    copyArtifacts(historyDir, join(outputWeekDir, "history"));
    writeFileSync(
      join(outputWeekDir, "week-summary.json"),
      `${JSON.stringify({ substrate: config.substrate, week: label, weekDate, branch, screenshotDirs }, null, 2)}\n`,
    );

    if (!config.skipGit) {
      runCommand(["git", "add", historyDir, outputWeekDir]);
      runCommand(["git", "commit", "-m", `chore(sim): ${config.substrate} ${label} artifacts`]);
      const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
      heads.push(head);
    } else {
      heads.push(`${branch}:${analyticsOutput.analytics.version_sha}`);
    }
    previousAnalytics = analyticsOutput.analytics;
  }
  return heads;
}

function parseConfig(path: string): SimulationConfig {
  return JSON.parse(readFileSync(path, "utf8")) as SimulationConfig;
}

if (import.meta.main) {
  const configPath = Bun.argv[2];
  if (!configPath) {
    console.error("Usage: bun scripts/run-simulation.ts <config.json>");
    process.exit(1);
  }
  runSimulation(parseConfig(configPath)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
