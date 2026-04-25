#!/usr/bin/env bun

import { existsSync, readFileSync, writeFileSync } from "node:fs";

function scrubHtml(source: string): string {
  let output = source;

  if (!/<meta\s+name=["']robots["']/i.test(output)) {
    output = output.replace(
      /<head([^>]*)>/i,
      '<head$1><meta name="robots" content="noindex,nofollow">',
    );
  }

  output = output.replace(/<script\b([^>]*\bdata-website-id=["'][^"']+["'][^>]*)>/gi, (match) => {
    return /\bdata-preview=["']1["']/i.test(match)
      ? match
      : match.replace(/>$/, ' data-preview="1">');
  });

  return output;
}

function main(): void {
  const files = Bun.argv.slice(2);
  if (files.length === 0) {
    console.error("Usage: bun scripts/prepare-preview-build.ts <html-file> [...html-file]");
    process.exit(2);
  }

  for (const file of files) {
    if (!existsSync(file)) {
      throw new Error(`missing preview HTML file: ${file}`);
    }
    const source = readFileSync(file, "utf8");
    writeFileSync(file, scrubHtml(source));
  }
}

if (import.meta.main) {
  main();
}

export { scrubHtml };
