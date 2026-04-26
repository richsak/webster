import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "../browser-audit.ts");

describe("browser-audit", () => {
  test("writes fallback artifacts when Playwright is unavailable", () => {
    const outDir = mkdtempSync(join(tmpdir(), "browser-audit-"));
    try {
      const result = Bun.spawnSync(["bun", SCRIPT, "https://example.test", "--out", outDir], {
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          WEBSTER_FORCE_BROWSER_AUDIT_FALLBACK: "1",
        },
      });

      expect(result.exitCode).toBe(0);
      expect(existsSync(join(outDir, "summary.json"))).toBe(true);
      expect(readFileSync(join(outDir, "a11y-text.txt"), "utf8")).toContain(
        "Screenshot capture unavailable",
      );
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
