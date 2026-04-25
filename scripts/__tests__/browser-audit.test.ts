import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "../browser-audit.ts");

describe("browser-audit", () => {
  test("writes Playwright screenshot artifacts for file URLs", () => {
    const outDir = mkdtempSync(join(tmpdir(), "browser-audit-playwright-"));
    try {
      const result = Bun.spawnSync(
        [
          "bun",
          SCRIPT,
          `file://${process.cwd()}/demo-landing-page/ugly/index.html`,
          "--out",
          outDir,
        ],
        { stdout: "pipe", stderr: "pipe" },
      );

      expect(result.exitCode).toBe(0);
      expect(existsSync(join(outDir, "mobile.png"))).toBe(true);
      expect(existsSync(join(outDir, "tablet.png"))).toBe(true);
      expect(existsSync(join(outDir, "desktop.png"))).toBe(true);
      const summary = JSON.parse(readFileSync(join(outDir, "summary.json"), "utf8")) as {
        breakpoints: { screenshot: string }[];
      };
      expect(summary.breakpoints.map((breakpoint) => breakpoint.screenshot)).toEqual([
        "mobile.png",
        "tablet.png",
        "desktop.png",
      ]);
      expect(existsSync(join(outDir, "console.json"))).toBe(true);
      expect(existsSync(join(outDir, "interactions.json"))).toBe(true);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  test("fails loudly on real Playwright runtime errors", () => {
    const outDir = mkdtempSync(join(tmpdir(), "browser-audit-runtime-failure-"));
    try {
      const result = Bun.spawnSync(["bun", SCRIPT, "not-a-valid-url", "--out", outDir], {
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(result.exitCode).not.toBe(0);
      expect(existsSync(join(outDir, "summary.json"))).toBe(false);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  test("writes fallback artifacts when Playwright is unavailable", () => {
    const outDir = mkdtempSync(join(tmpdir(), "browser-audit-"));
    try {
      const result = Bun.spawnSync(["bun", SCRIPT, "https://example.test", "--out", outDir], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, WEBSTER_BROWSER_AUDIT_DISABLE_PLAYWRIGHT: "1" },
      });

      expect(result.exitCode).toBe(0);
      expect(existsSync(join(outDir, "summary.json"))).toBe(true);
      const summary = JSON.parse(readFileSync(join(outDir, "summary.json"), "utf8")) as {
        screenshot_capture_unavailable: string;
        breakpoints: { screenshot: string | null }[];
      };
      expect(summary.screenshot_capture_unavailable).toContain("Screenshot capture unavailable");
      expect(summary.breakpoints).toHaveLength(3);
      expect(summary.breakpoints.every((breakpoint) => breakpoint.screenshot === null)).toBe(true);
      expect(readFileSync(join(outDir, "a11y-text.txt"), "utf8")).toContain(
        "Screenshot capture unavailable",
      );
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
