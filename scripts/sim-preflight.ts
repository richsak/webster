#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { hasMemoryStoreEvidence, isAuthExpired } from "./capture-mem-stores.ts";

type SimAgentsManifest = Record<string, Record<string, string>>;

type MemoryStoresManifest = Record<string, Record<string, string>>;

const REQUIRED_AGENT_SETS = ["webster-lp-sim", "webster-site-sim"] as const;
const REQUIRED_AGENT_ROLES = [
  "monitor",
  "seo-critic",
  "brand-voice-critic",
  "conversion-critic",
  "copy-critic",
  "redesigner",
  "planner",
  "visual-reviewer",
] as const;
const REQUIRED_MEMORY_ROLES = [
  "council",
  "planner",
  "redesigner",
  "genealogy",
  "conversion-critic",
  "visual-reviewer",
] as const;

function fail(message: string): never {
  throw new Error(message);
}

function readJson<T>(path: string): T {
  if (!existsSync(path)) {
    fail(`missing ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function checkManifestFiles(): void {
  const agents = readJson<SimAgentsManifest>("context/sim-agents.json");
  if (Object.keys(agents).length !== 2) {
    fail("context/sim-agents.json must contain exactly 2 sim agent sets");
  }
  for (const set of REQUIRED_AGENT_SETS) {
    const roles = agents[set] ?? fail(`missing agent set ${set}`);
    const expectedRoles =
      set === "webster-site-sim"
        ? [...REQUIRED_AGENT_ROLES, "licensing-and-warranty-critic"]
        : [...REQUIRED_AGENT_ROLES, "fh-compliance-critic"];
    if (Object.keys(roles).length !== 9) {
      fail(`${set} must contain exactly 9 registered roles`);
    }
    for (const role of expectedRoles) {
      if (!roles[role]) {
        fail(`missing ${set}.${role} in context/sim-agents.json`);
      }
    }
  }

  const stores = readJson<MemoryStoresManifest>("context/memory-stores.json");
  if (Object.keys(stores).length !== 2) {
    fail("context/memory-stores.json must contain exactly 2 substrates");
  }
  for (const substrate of ["lp", "site"] as const) {
    const roles = stores[substrate] ?? fail(`missing memory stores for ${substrate}`);
    if (Object.keys(roles).length !== 6) {
      fail(`${substrate} must contain exactly 6 memory stores`);
    }
    for (const role of REQUIRED_MEMORY_ROLES) {
      if (!roles[role]) {
        fail(`missing memory store ${substrate}.${role}`);
      }
    }
  }
}

function checkCommand(command: string[]): string {
  return execFileSync(command[0] ?? "", command.slice(1), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
}

function checkScriptBuilds(path: string): void {
  checkCommand(["bun", "build", path, "--target", "bun", "--outdir", "/tmp/webster-sim-preflight"]);
}

export function runSimPreflight(): void {
  checkManifestFiles();
  checkScriptBuilds("scripts/run-simulation-lp.ts");
  checkScriptBuilds("scripts/run-simulation-site.ts");
  checkScriptBuilds("scripts/capture-mem-stores.ts");
  checkCommand(["browser-use", "doctor"]);
  if (process.env.WEBSTER_REQUIRE_CONSOLE_CAPTURE !== "1") {
    return;
  }
  checkCommand([
    "browser-use",
    "-b",
    "real",
    "--profile",
    "Default",
    "open",
    process.env.WEBSTER_MEMORY_STORES_CONSOLE_URL ??
      "https://console.anthropic.com/settings/memory-stores",
  ]);
  const state = checkCommand(["browser-use", "-b", "real", "--profile", "Default", "state"]);
  if (isAuthExpired(state, 100_000) || !hasMemoryStoreEvidence(state)) {
    fail("AUTH_EXPIRED: Anthropic Console Memory Stores page is not authenticated/reachable");
  }
}

if (import.meta.main) {
  try {
    runSimPreflight();
    console.log("sim preflight ok");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
