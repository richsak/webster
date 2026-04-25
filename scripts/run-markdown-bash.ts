#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function extractBashBlocks(markdown: string): string {
  const blocks: string[] = [];
  const fence = /```bash\n([\s\S]*?)\n```/g;
  for (const match of markdown.matchAll(fence)) {
    blocks.push(match[1] ?? "");
  }
  if (blocks.length === 0) {
    throw new Error("no bash code blocks found");
  }
  return ["set -euo pipefail", ...blocks].join("\n\n");
}

export function runMarkdownBash(path: string): void {
  const markdown = readFileSync(path, "utf8");
  execFileSync("bash", ["-lc", extractBashBlocks(markdown)], {
    env: process.env,
    stdio: "inherit",
  });
}

if (import.meta.main) {
  const path = Bun.argv[2];
  if (!path) {
    console.error("Usage: bun scripts/run-markdown-bash.ts <markdown-file>");
    process.exit(1);
  }
  try {
    runMarkdownBash(path);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
