import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { describe, expect, test } from "bun:test";
import { buildDemoManifest } from "../build-demo-manifest.ts";

function requireMagick(): void {
  execFileSync("magick", ["-version"], { stdio: "ignore" });
}

function writePng(path: string, color: string, label: string): void {
  execFileSync("magick", [
    "-size",
    "1440x900",
    `xc:${color}`,
    "-gravity",
    "center",
    "-fill",
    "white",
    "-pointsize",
    "72",
    "-annotate",
    "0",
    label,
    path,
  ]);
}

function seedWeek(root: string, week: string, color: string): void {
  const weekDir = join(root, week);
  const historyDir = join(weekDir, "history");
  const screenshotDir = join(weekDir, "screenshots/index");
  mkdirSync(historyDir, { recursive: true });
  mkdirSync(screenshotDir, { recursive: true });
  writeFileSync(join(weekDir, "week-summary.json"), JSON.stringify({ week }));
  writeFileSync(join(historyDir, "analytics.json"), JSON.stringify({ sessions: 5000 }));
  writeFileSync(join(historyDir, "analytics-reasoning.md"), `# ${week} reasoning\n`);
  writeFileSync(join(historyDir, "proposal.md"), `# ${week} proposal\n`);
  writeFileSync(join(historyDir, "critic-genealogy.md"), `# ${week} genealogy\n`);
  writePng(join(screenshotDir, "desktop.png"), color, week);
  writePng(join(screenshotDir, "mobile.png"), color, `${week} mobile`);
  writePng(join(screenshotDir, "tablet.png"), color, `${week} tablet`);
}

describe("buildDemoManifest", () => {
  test("writes schema-valid manifest with absolute paths and a final PNG sheet", () => {
    requireMagick();
    const outDir = mkdtempSync(join(tmpdir(), "webster-demo-manifest-"));
    const memoryPath = join(outDir, "memory-stores.json");
    writeFileSync(memoryPath, JSON.stringify({ lp: { council: "mem_council" } }));
    seedWeek(outDir, "week-00", "#7f1d1d");
    seedWeek(outDir, "week-10", "#14532d");

    const manifest = buildDemoManifest({
      substrate: "lp",
      outputDir: outDir,
      memoryStoresPath: memoryPath,
    });

    expect(existsSync(join(outDir, "demo-manifest.json"))).toBe(true);
    expect(existsSync(join(outDir, "final-sheet.png"))).toBe(true);
    expect(readFileSync(join(outDir, "final-sheet.png")).subarray(0, 8).toString("hex")).toBe(
      "89504e470d0a1a0a",
    );
    expect(manifest.schema_version).toBe(1);
    expect(manifest.memory_stores).toEqual({ council: "mem_council" });
    expect(manifest.weeks.map((week) => week.week)).toEqual(["week-00", "week-10"]);
    expect(isAbsolute(manifest.weeks[0]?.history.analytics ?? "")).toBe(true);
    expect(isAbsolute(manifest.weeks[0]?.screenshots.index?.desktop ?? "")).toBe(true);
    expect(isAbsolute(manifest.weeks[0]?.councilArtifacts["history/proposal.md"] ?? "")).toBe(true);
    expect(manifest.weeks[0]?.genealogyEvents).toHaveLength(1);

    const written = JSON.parse(
      readFileSync(join(outDir, "demo-manifest.json"), "utf8"),
    ) as typeof manifest;
    expect(written.final_sheet).toBe(manifest.final_sheet);
  });

  test("fails when final desktop screenshots are missing", () => {
    const outDir = mkdtempSync(join(tmpdir(), "webster-demo-manifest-missing-shot-"));
    mkdirSync(join(outDir, "week-00/history"), { recursive: true });
    writeFileSync(join(outDir, "week-00/history/analytics.json"), "{}\n");

    expect(() =>
      buildDemoManifest({ substrate: "site", outputDir: outDir, memoryStoresPath: "missing.json" }),
    ).toThrow("final sheet requires week-0 and final desktop screenshots");
  });
});
