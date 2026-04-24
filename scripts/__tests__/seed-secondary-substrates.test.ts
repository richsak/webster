import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  ROOT,
  SECONDARY_HISTORY_DIR,
  SECONDARY_RUNS,
  SECONDARY_SITE_DIR,
  SECONDARY_SUBSTRATES,
  main,
} from "../seed-secondary-substrates.ts";

const REQUIRED_RUN_ARTIFACTS = ["apply-log.json", "decision.json", "proposal.md", "verdict.json"];
const PROTECTED_DIRS = [
  join(ROOT, "history", "demo-arc"),
  join(ROOT, "site", "before"),
  join(ROOT, "site", "after"),
];

function collectFileContents(rootDir: string): Record<string, string> {
  if (!existsSync(rootDir)) {
    return {};
  }

  const entries = readdirSync(rootDir).sort((left, right) => left.localeCompare(right));
  const contents: Record<string, string> = {};

  for (const entry of entries) {
    const fullPath = join(rootDir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      Object.assign(contents, collectFileContents(fullPath));
      continue;
    }

    if (stat.isFile()) {
      contents[relative(rootDir, fullPath)] = readFileSync(fullPath, "utf8");
    }
  }

  return Object.fromEntries(
    Object.entries(contents).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function collectOwnedFileContents(): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(collectFileContents(SECONDARY_SITE_DIR)).map(([path, content]) => [
        `site/secondary/${path}`,
        content,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(collectFileContents(SECONDARY_HISTORY_DIR)).map(([path, content]) => [
        `history/secondary-arc/${path}`,
        content,
      ]),
    ),
  };
}

function fingerprintProtectedDirs(): Record<string, Record<string, string>> {
  return Object.fromEntries(
    PROTECTED_DIRS.map((dir) => [relative(ROOT, dir), collectFileContents(dir)]),
  );
}

describe("secondary substrate seeder", () => {
  test("writes expected landing pages and run artifact layout", () => {
    main();

    for (const substrate of SECONDARY_SUBSTRATES) {
      expect(existsSync(join(SECONDARY_SITE_DIR, substrate, "index.html"))).toBe(true);

      for (const run of SECONDARY_RUNS) {
        const runDir = join(SECONDARY_HISTORY_DIR, substrate, run);
        expect(existsSync(runDir)).toBe(true);
        expect(readdirSync(runDir).sort()).toEqual(REQUIRED_RUN_ARTIFACTS);
      }
    }
  });

  test("is byte-identical when run repeatedly", () => {
    main();
    const firstPass = collectOwnedFileContents();

    main();
    const secondPass = collectOwnedFileContents();

    expect(secondPass).toEqual(firstPass);
  });

  test("does not mutate protected primary demo directories", () => {
    const before = fingerprintProtectedDirs();

    main();

    expect(fingerprintProtectedDirs()).toEqual(before);
  });
});
