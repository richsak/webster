#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface MemoryScreenshotEntry {
  substrate: "lp" | "site" | "manual";
  week: 1 | 5 | 10 | null;
  path: string;
  bytes: number;
}

export interface MemoryScreenshotManifest {
  generated_at: string;
  screenshots: MemoryScreenshotEntry[];
  manual_proof: MemoryScreenshotEntry[];
}

const DEFAULT_ROOT = "assets/memory-stores-screenshots";
const EXPECTED_WEEKS = [1, 5, 10] as const;
const SUBSTRATES = ["lp", "site"] as const;

export function buildMemoryScreenshotManifest(
  root = DEFAULT_ROOT,
  options: { requireComplete?: boolean } = {},
): MemoryScreenshotManifest {
  const screenshots: MemoryScreenshotEntry[] = [];
  const missing: string[] = [];
  for (const substrate of SUBSTRATES) {
    const dir = resolve(root, substrate);
    const files = existsSync(dir) ? new Set(readdirSync(dir)) : new Set<string>();
    for (const week of EXPECTED_WEEKS) {
      const file = `week-${week}.png`;
      if (!files.has(file)) {
        missing.push(`${substrate}/${file}`);
        continue;
      }
      const path = resolve(dir, file);
      screenshots.push({ substrate, week, path, bytes: statSync(path).size });
    }
  }
  if (options.requireComplete && missing.length > 0) {
    throw new Error(`missing memory screenshots: ${missing.join(", ")}`);
  }
  const manualDir = resolve(root, "manual");
  const manualProof: MemoryScreenshotEntry[] = existsSync(manualDir)
    ? readdirSync(manualDir)
        .filter((file) => file.endsWith(".png"))
        .sort()
        .map((file) => {
          const path = resolve(manualDir, file);
          return { substrate: "manual", week: null, path, bytes: statSync(path).size };
        })
    : [];
  return { generated_at: new Date().toISOString(), screenshots, manual_proof: manualProof };
}

export function writeMemoryScreenshotManifest(
  root = DEFAULT_ROOT,
  output = `${DEFAULT_ROOT}/manifest.json`,
): MemoryScreenshotManifest {
  const manifest = buildMemoryScreenshotManifest(root, {
    requireComplete: process.env.WEBSTER_REQUIRE_AUTO_MEMORY_SCREENSHOTS === "1",
  });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.main) {
  const output = Bun.argv[2] ?? `${DEFAULT_ROOT}/manifest.json`;
  const manifest = writeMemoryScreenshotManifest(DEFAULT_ROOT, output);
  console.log(`wrote ${output} (${manifest.screenshots.length} screenshots)`);
}
