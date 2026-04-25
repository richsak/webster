#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { findAgentByName } from "./anthropic-agents.ts";

const API_BASE = process.env.ANTHROPIC_API_BASE ?? "https://api.anthropic.com";
const API = `${API_BASE.replace(/\/$/, "")}/v1`;
const BETA = "managed-agents-2026-04-01";
const VERSION = "2023-06-01";
const AGENTS_DIR = "agents";
const OUTPUT_PATH = "context/sim-agents.json";

const AGENT_SETS = ["webster-lp-sim", "webster-site-sim"] as const;
type AgentSet = (typeof AGENT_SETS)[number];
export type SimAgentManifest = Record<AgentSet, Record<string, string>>;

interface AgentSpec {
  name: string;
  description: string;
  model: string;
  system: string;
  tools: unknown[];
  mcp_servers?: unknown[];
  metadata?: Record<string, string>;
}

function headers(apiKey: string, withContentType = false): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": VERSION,
    "anthropic-beta": BETA,
    ...(withContentType ? { "content-type": "application/json" } : {}),
  };
}

export function loadSimAgentSpecs(agentsDir = AGENTS_DIR): AgentSpec[] {
  return readdirSync(agentsDir)
    .filter((file) => /^webster-(lp|site)-sim-.*\.json$/.test(file))
    .sort()
    .map((file) => JSON.parse(readFileSync(join(agentsDir, file), "utf8")) as AgentSpec);
}

function emptyManifest(): SimAgentManifest {
  return { "webster-lp-sim": {}, "webster-site-sim": {} };
}

function setForAgent(name: string): AgentSet {
  if (name.startsWith("webster-lp-sim-")) {
    return "webster-lp-sim";
  }
  if (name.startsWith("webster-site-sim-")) {
    return "webster-site-sim";
  }
  throw new Error(`not a sim agent name: ${name}`);
}

function roleKey(name: string): string {
  return name.replace(/^webster-(lp|site)-sim-/, "");
}

async function registerAgent(apiKey: string, spec: AgentSpec): Promise<string> {
  const existing = await findAgentByName(apiKey, spec.name);
  if (existing) {
    return existing;
  }

  const res = await fetch(`${API}/agents`, {
    method: "POST",
    headers: headers(apiKey, true),
    body: JSON.stringify(spec),
  });
  if (!res.ok) {
    throw new Error(
      `agent registration failed for ${spec.name} (${res.status}): ${await res.text()}`,
    );
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error(`agent registration returned no id for ${spec.name}: ${JSON.stringify(data)}`);
  }
  return data.id;
}

export async function registerSimAgents(
  apiKey: string,
  outputPath = OUTPUT_PATH,
  agentsDir = AGENTS_DIR,
): Promise<SimAgentManifest> {
  const specs = loadSimAgentSpecs(agentsDir);
  if (specs.length !== 18) {
    throw new Error(`expected 18 sim agent specs, found ${specs.length}`);
  }

  const manifest = emptyManifest();
  for (const spec of specs) {
    const id = await registerAgent(apiKey, spec);
    manifest[setForAgent(spec.name)][roleKey(spec.name)] = id;
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function getAPIKey(): string {
  const fromEnv = process.env.ANTHROPIC_API_KEY;
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const key = execFileSync(
      "security",
      ["find-generic-password", "-s", "anthropic-webster", "-a", process.env.USER ?? "", "-w"],
      { encoding: "utf8" },
    ).trim();
    if (key) {
      return key;
    }
  } catch {
    // fall through to fail
  }
  throw new Error(
    "ANTHROPIC_API_KEY missing from env AND macOS keychain service anthropic-webster",
  );
}

async function main(): Promise<void> {
  const outputPath = process.env.WEBSTER_SIM_AGENTS_PATH ?? OUTPUT_PATH;
  const manifest = await registerSimAgents(getAPIKey(), outputPath);
  console.log(`wrote ${outputPath}`);
  for (const set of AGENT_SETS) {
    for (const [role, id] of Object.entries(manifest[set]).sort()) {
      console.log(`${set}-${role} ${id}`);
    }
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
