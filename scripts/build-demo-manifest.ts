#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

export interface DemoManifestWeek {
  week: string;
  index: number;
  path: string;
  summary: string | null;
  history: {
    analytics: string | null;
    reasoning: string | null;
  };
  screenshots: Record<string, Record<string, string>>;
  councilArtifacts: Record<string, string>;
  genealogyEvents: string[];
}

export interface DemoManifest {
  schema_version: 1;
  substrate: string;
  generated_at: string;
  output_dir: string;
  manifest_path: string;
  final_sheet: string;
  memory_stores: Record<string, string>;
  weeks: DemoManifestWeek[];
}

interface Args {
  substrate: string;
  outputDir: string;
  memoryStoresPath: string;
}

export const DEMO_MANIFEST_SCHEMA = {
  type: "object",
  required: [
    "schema_version",
    "substrate",
    "generated_at",
    "output_dir",
    "manifest_path",
    "final_sheet",
    "memory_stores",
    "weeks",
  ],
  properties: {
    schema_version: { const: 1 },
    substrate: { type: "string", minLength: 1 },
    generated_at: { type: "string", minLength: 1 },
    output_dir: { type: "string", path: "absolute" },
    manifest_path: { type: "string", path: "absolute" },
    final_sheet: { type: "string", path: "absolute" },
    memory_stores: { type: "object", additionalProperties: { type: "string" } },
    weeks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: [
          "week",
          "index",
          "path",
          "summary",
          "history",
          "screenshots",
          "councilArtifacts",
          "genealogyEvents",
        ],
        properties: {
          week: { type: "string", pattern: "^week-\\d+$" },
          index: { type: "integer", minimum: 0 },
          path: { type: "string", path: "absolute" },
          summary: { anyOf: [{ type: "string", path: "absolute" }, { type: "null" }] },
          history: {
            type: "object",
            required: ["analytics", "reasoning"],
            properties: {
              analytics: { anyOf: [{ type: "string", path: "absolute" }, { type: "null" }] },
              reasoning: { anyOf: [{ type: "string", path: "absolute" }, { type: "null" }] },
            },
          },
          screenshots: {
            type: "object",
            additionalProperties: {
              type: "object",
              properties: {
                mobile: { type: "string", path: "absolute" },
                tablet: { type: "string", path: "absolute" },
                desktop: { type: "string", path: "absolute" },
              },
            },
          },
          councilArtifacts: {
            type: "object",
            additionalProperties: { type: "string", path: "absolute" },
          },
          genealogyEvents: {
            type: "array",
            items: { type: "string", path: "absolute" },
          },
        },
      },
    },
  },
} as const;

const SCREENSHOT_NAMES = new Set(["mobile.png", "tablet.png", "desktop.png"]);
const COUNCIL_ARTIFACT_NAMES = new Set([
  "plan.md",
  "proposal.md",
  "decision.json",
  "visual-review.md",
  "monitor.md",
  "genealogy.md",
]);

function parseArgs(argv: string[]): Args {
  const substrate = readFlag(argv, "--substrate");
  const outputDir = readFlag(argv, "--output-dir");
  const memoryStoresPath = readFlag(argv, "--memory-stores") ?? "context/memory-stores.json";
  if (!substrate || !outputDir) {
    throw new Error(
      "Usage: bun scripts/build-demo-manifest.ts --substrate <lp|site> --output-dir <demo-output/substrate> [--memory-stores context/memory-stores.json]",
    );
  }
  return { substrate, outputDir, memoryStoresPath };
}

function readFlag(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

function absolute(path: string): string {
  return isAbsolute(path) ? path : resolve(path);
}

function listFilesRecursive(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }
  const entries = readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursive(path);
    }
    return [path];
  });
}

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function loadMemoryStores(path: string, substrate: string): Record<string, string> {
  const stores = readJsonFile<Record<string, Record<string, string>>>(path);
  return stores?.[substrate] ?? {};
}

function buildWeek(weekDir: string): DemoManifestWeek {
  const week = basename(weekDir);
  const index = Number.parseInt(week.replace(/^week-/, ""), 10);
  const files = listFilesRecursive(weekDir);
  const screenshots: Record<string, Record<string, string>> = {};
  const councilArtifacts: Record<string, string> = {};
  const genealogyEvents: string[] = [];

  for (const file of files) {
    const name = basename(file);
    if (SCREENSHOT_NAMES.has(name)) {
      const page = basename(dirname(file));
      screenshots[page] = {
        ...(screenshots[page] ?? {}),
        [name.replace(".png", "")]: absolute(file),
      };
    }
    if (COUNCIL_ARTIFACT_NAMES.has(name) || file.includes(`${week}/history/`)) {
      const key = file.slice(weekDir.length + 1);
      if (name !== "analytics.json" && name !== "analytics-reasoning.md") {
        councilArtifacts[key] = absolute(file);
      }
    }
    if (/^(critic-genealogy|genealogy|spawn).*(\.md|\.json|\.jsonl|\.txt)$/i.test(name)) {
      genealogyEvents.push(absolute(file));
    }
  }

  return {
    week,
    index,
    path: absolute(weekDir),
    summary: existsSync(join(weekDir, "week-summary.json"))
      ? absolute(join(weekDir, "week-summary.json"))
      : null,
    history: {
      analytics: existsSync(join(weekDir, "history/analytics.json"))
        ? absolute(join(weekDir, "history/analytics.json"))
        : null,
      reasoning: existsSync(join(weekDir, "history/analytics-reasoning.md"))
        ? absolute(join(weekDir, "history/analytics-reasoning.md"))
        : null,
    },
    screenshots,
    councilArtifacts,
    genealogyEvents: genealogyEvents.sort(),
  };
}

export function validateDemoManifest(manifest: DemoManifest): void {
  if (manifest.schema_version !== 1) {
    throw new Error("manifest schema_version must be 1");
  }
  if (
    !manifest.substrate ||
    !isAbsolute(manifest.output_dir) ||
    !isAbsolute(manifest.manifest_path)
  ) {
    throw new Error("manifest paths must be absolute and substrate must be present");
  }
  if (manifest.weeks.length === 0) {
    throw new Error("manifest must include at least one week");
  }
  for (const week of manifest.weeks) {
    if (!Number.isInteger(week.index) || !isAbsolute(week.path)) {
      throw new Error(`invalid week entry ${week.week}`);
    }
    if (week.history.analytics && !isAbsolute(week.history.analytics)) {
      throw new Error(`week ${week.week} analytics path must be absolute`);
    }
    for (const page of Object.values(week.screenshots)) {
      for (const path of Object.values(page)) {
        if (!isAbsolute(path)) {
          throw new Error(`week ${week.week} screenshot path must be absolute`);
        }
      }
    }
  }
}

function findDesktopHero(week: DemoManifestWeek): string | null {
  const preferred = week.screenshots.index?.desktop;
  if (preferred) {
    return preferred;
  }
  for (const page of Object.values(week.screenshots)) {
    if (page.desktop) {
      return page.desktop;
    }
  }
  return null;
}

function assertPng(path: string): void {
  const header = readFileSync(path).subarray(0, 8).toString("hex");
  if (header !== "89504e470d0a1a0a") {
    throw new Error(`final sheet was not written as a PNG: ${path}`);
  }
}

function buildFinalSheet(manifest: DemoManifest): void {
  const first = manifest.weeks.find((week) => week.week === "week-00");
  const last = manifest.weeks.at(-1);
  if (!first || !last) {
    throw new Error("final sheet requires week-00 and at least one final week");
  }
  const firstDesktop = findDesktopHero(first);
  const lastDesktop = findDesktopHero(last);
  if (!firstDesktop || !lastDesktop) {
    throw new Error("final sheet requires week-0 and final desktop screenshots");
  }
  mkdirSync(dirname(manifest.final_sheet), { recursive: true });
  const title = `${manifest.substrate.toUpperCase()} Webster simulation: Week 0 to ${last.week}`;
  execFileSync("magick", [
    "-size",
    "2200x120",
    "xc:#111827",
    "-gravity",
    "center",
    "-fill",
    "#ffffff",
    "-pointsize",
    "42",
    "-annotate",
    "0",
    title,
    "(",
    firstDesktop,
    "-resize",
    "1080x900^",
    "-gravity",
    "north",
    "-crop",
    "1080x900+0+0",
    "+repage",
    "-bordercolor",
    "#ef4444",
    "-border",
    "8",
    ")",
    "(",
    lastDesktop,
    "-resize",
    "1080x900^",
    "-gravity",
    "north",
    "-crop",
    "1080x900+0+0",
    "+repage",
    "-bordercolor",
    "#22c55e",
    "-border",
    "8",
    ")",
    "+append",
    "-append",
    manifest.final_sheet,
  ]);
  assertPng(manifest.final_sheet);
}

export function buildDemoManifest(args: Args): DemoManifest {
  const outputDir = absolute(args.outputDir);
  const weekDirs = readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^week-\d+$/.test(entry.name))
    .map((entry) => join(outputDir, entry.name))
    .sort();
  const manifest: DemoManifest = {
    schema_version: 1,
    substrate: args.substrate,
    generated_at: new Date().toISOString(),
    output_dir: outputDir,
    manifest_path: join(outputDir, "demo-manifest.json"),
    final_sheet: join(outputDir, "final-sheet.png"),
    memory_stores: loadMemoryStores(args.memoryStoresPath, args.substrate),
    weeks: weekDirs.map(buildWeek),
  };
  validateDemoManifest(manifest);
  buildFinalSheet(manifest);
  writeFileSync(manifest.manifest_path, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (import.meta.main) {
  try {
    const manifest = buildDemoManifest(parseArgs(Bun.argv.slice(2)));
    console.log(`Wrote ${manifest.manifest_path}`);
    console.log(`Wrote ${manifest.final_sheet}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
