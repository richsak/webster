import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  buildDemoManifest,
  DEMO_MANIFEST_SCHEMA,
  validateDemoManifest,
} from "../build-demo-manifest.ts";

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
    writeFileSync(
      memoryPath,
      JSON.stringify({
        lp: { council: "mem_council" },
        site: { council: "mem_site_council" },
      }),
    );
    seedWeek(outDir, "week-10", "#14532d");
    seedWeek(outDir, "week-00", "#7f1d1d");
    seedWeek(outDir, "week-02", "#1e3a8a");
    writeFileSync(
      join(outDir, "week-00/history/decision.json"),
      JSON.stringify({ selected: true }),
    );
    writeFileSync(
      join(outDir, "week-00/history/spawn-event.json"),
      JSON.stringify({ critic: "x" }),
    );

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
    expect(DEMO_MANIFEST_SCHEMA.properties.schema_version.const).toBe(1);
    expect(DEMO_MANIFEST_SCHEMA.properties.weeks.items.properties.history.required).toEqual([
      "analytics",
      "reasoning",
    ]);
    expect(
      DEMO_MANIFEST_SCHEMA.properties.weeks.items.properties.screenshots.additionalProperties
        .properties.desktop.path,
    ).toBe("absolute");
    expect(manifest.schema_version).toBe(1);
    expect(manifest.memory_stores).toEqual({ council: "mem_council" });
    expect(isAbsolute(manifest.output_dir)).toBe(true);
    expect(isAbsolute(manifest.manifest_path)).toBe(true);
    expect(isAbsolute(manifest.final_sheet)).toBe(true);
    expect(manifest.weeks.map((week) => week.week)).toEqual(["week-00", "week-02", "week-10"]);
    expect(isAbsolute(manifest.weeks[0]?.history.analytics ?? "")).toBe(true);
    expect(isAbsolute(manifest.weeks[0]?.screenshots.index?.desktop ?? "")).toBe(true);
    expect(isAbsolute(manifest.weeks[0]?.councilArtifacts["history/proposal.md"] ?? "")).toBe(true);
    expect(isAbsolute(manifest.weeks[0]?.councilArtifacts["history/decision.json"] ?? "")).toBe(
      true,
    );
    expect(manifest.weeks[0]?.genealogyEvents).toHaveLength(2);
    validateDemoManifest(manifest);

    const written = JSON.parse(
      readFileSync(join(outDir, "demo-manifest.json"), "utf8"),
    ) as typeof manifest;
    expect(written.final_sheet).toBe(manifest.final_sheet);
  });

  test("loads substrate-specific memory stores", () => {
    requireMagick();
    const outDir = mkdtempSync(join(tmpdir(), "webster-demo-manifest-site-memory-"));
    const memoryPath = join(outDir, "memory-stores.json");
    writeFileSync(
      memoryPath,
      JSON.stringify({
        lp: { council: "mem_lp_council" },
        site: { council: "mem_site_council", planner: "mem_site_planner" },
      }),
    );
    seedWeek(outDir, "week-00", "#172554");

    const manifest = buildDemoManifest({
      substrate: "site",
      outputDir: outDir,
      memoryStoresPath: memoryPath,
    });

    expect(manifest.memory_stores).toEqual({
      council: "mem_site_council",
      planner: "mem_site_planner",
    });
  });

  test("requires week-00 as the final-sheet baseline", () => {
    requireMagick();
    const outDir = mkdtempSync(join(tmpdir(), "webster-demo-manifest-no-week-zero-"));
    seedWeek(outDir, "week-01", "#581c87");

    expect(() =>
      buildDemoManifest({ substrate: "lp", outputDir: outDir, memoryStoresPath: "missing.json" }),
    ).toThrow("final sheet requires week-00");
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
