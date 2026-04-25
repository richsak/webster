#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const API_BASE = process.env.ANTHROPIC_API_BASE ?? "https://api.anthropic.com";
const API = `${API_BASE.replace(/\/$/, "")}/v1`;
const BETA = "managed-agents-2026-04-01";
const VERSION = "2023-06-01";
const OUTPUT_PATH = "context/memory-stores.json";

export const SUBSTRATES = ["lp", "site"] as const;
export const ROLES = [
  "council",
  "planner",
  "redesigner",
  "genealogy",
  "conversion-critic",
  "visual-reviewer",
] as const;

type Substrate = (typeof SUBSTRATES)[number];
type Role = (typeof ROLES)[number];

export type MemoryStoreManifest = Record<Substrate, Record<Role, string>>;

interface MemoryStoreListItem {
  id: string;
  name: string;
}

interface MemoryStoreListResponse {
  data?: MemoryStoreListItem[];
  next_page?: string | null;
  has_more?: boolean;
  last_id?: string | null;
}

function headers(apiKey: string, withContentType = false): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": VERSION,
    "anthropic-beta": BETA,
    ...(withContentType ? { "content-type": "application/json" } : {}),
  };
}

export function memoryStoreName(substrate: Substrate, role: Role): string {
  return `webster-${role}-memory-${substrate}`;
}

function emptyManifest(): MemoryStoreManifest {
  return {
    lp: {
      council: "",
      planner: "",
      redesigner: "",
      genealogy: "",
      "conversion-critic": "",
      "visual-reviewer": "",
    },
    site: {
      council: "",
      planner: "",
      redesigner: "",
      genealogy: "",
      "conversion-critic": "",
      "visual-reviewer": "",
    },
  };
}

function readExistingManifest(path: string): Partial<MemoryStoreManifest> {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Partial<MemoryStoreManifest>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    if (error instanceof SyntaxError) {
      throw new Error(
        `existing memory store manifest is invalid JSON at ${path}: ${error.message}`,
      );
    }
    throw error;
  }
}

async function findMemoryStoreByName(apiKey: string, name: string): Promise<string | null> {
  let url = `${API}/memory_stores`;

  while (url) {
    const res = await fetch(url, { headers: headers(apiKey) });
    if (!res.ok) {
      throw new Error(`memory store list failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as MemoryStoreListResponse;
    const match = data.data?.find((store) => store.name === name);
    if (match) {
      return match.id;
    }

    if (data.next_page) {
      url = data.next_page.startsWith("http") ? data.next_page : `${API}${data.next_page}`;
    } else if (data.has_more && data.last_id) {
      const nextUrl = new URL(url);
      nextUrl.searchParams.set("after_id", data.last_id);
      url = nextUrl.toString();
    } else {
      url = "";
    }
  }

  return null;
}

async function createMemoryStore(apiKey: string, name: string): Promise<string> {
  const res = await fetch(`${API}/memory_stores`, {
    method: "POST",
    headers: headers(apiKey, true),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`memory store create failed for ${name} (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error(`memory store create returned no id for ${name}: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function ensureMemoryStore(apiKey: string, name: string): Promise<string> {
  const existing = await findMemoryStoreByName(apiKey, name);
  return existing ?? createMemoryStore(apiKey, name);
}

function writeManifest(path: string, manifest: MemoryStoreManifest): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

export async function provisionMemoryStores(
  apiKey: string,
  outputPath = OUTPUT_PATH,
): Promise<MemoryStoreManifest> {
  const manifest = emptyManifest();
  const existingManifest = readExistingManifest(outputPath);

  for (const substrate of SUBSTRATES) {
    for (const role of ROLES) {
      const existingId = existingManifest[substrate]?.[role];
      if (existingId) {
        manifest[substrate][role] = existingId;
        continue;
      }

      manifest[substrate][role] = await ensureMemoryStore(apiKey, memoryStoreName(substrate, role));
      writeManifest(outputPath, manifest);
    }
  }

  writeManifest(outputPath, manifest);
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
  const outputPath = process.env.WEBSTER_MEMORY_STORES_PATH ?? OUTPUT_PATH;
  const manifest = await provisionMemoryStores(getAPIKey(), outputPath);
  console.log(`wrote ${outputPath}`);
  for (const substrate of SUBSTRATES) {
    for (const role of ROLES) {
      console.log(`${memoryStoreName(substrate, role)} ${manifest[substrate][role]}`);
    }
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
