import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSyntheticHeatmap } from "../build-synthetic-heatmap.ts";

describe("synthetic heatmap", () => {
  test("maps analytics section engagement onto measured layout regions", () => {
    const runRoot = mkdtempSync(join(tmpdir(), "webster-heatmap-"));
    try {
      mkdirSync(join(runRoot, "screenshots/w01"), { recursive: true });
      mkdirSync(join(runRoot, "history/w01"), { recursive: true });
      writeFileSync(
        join(runRoot, "screenshots/w01/layout-map.json"),
        `${JSON.stringify(
          {
            breakpoints: [
              {
                breakpoint: "desktop",
                width: 1440,
                height: 900,
                document_height: 1800,
                sections: [
                  {
                    id: "hero",
                    label: "Hero",
                    source: "explicit",
                    rect: { x: 120, y: 100, width: 1200, height: 500 },
                  },
                  {
                    id: "services",
                    label: "Services",
                    source: "explicit",
                    rect: { x: 120, y: 900, width: 1200, height: 300 },
                  },
                ],
                ctas: [
                  {
                    id: "discovery_call",
                    text: "Book a discovery call",
                    href: "#contact",
                    rect: { x: 700, y: 420, width: 220, height: 56 },
                  },
                ],
              },
            ],
          },
          null,
          2,
        )}\n`,
      );
      const analytics = {
        version_sha: "synthetic-test-w01",
        sessions: 5000,
        avg_time_s: 120,
        scroll_depth_25: 0.82,
        scroll_depth_50: 0.68,
        scroll_depth_75: 0.46,
        scroll_depth_100: 0.22,
        cta_clicks: { discovery_call: 300 },
        section_engagement: [
          { section: "hero", views: 5000, avg_time_s: 32, dropoff_rate: 0.48 },
          { section: "services", views: 3300, avg_time_s: 35, dropoff_rate: 0.34 },
        ],
      };
      writeFileSync(
        join(runRoot, "history/w01/analytics.json"),
        `${JSON.stringify(analytics, null, 2)}\n`,
      );

      const heatmap = buildSyntheticHeatmap(runRoot, "w01");
      const desktop = heatmap.breakpoints[0];
      expect(heatmap.synthetic).toBe(true);
      expect(desktop?.regions.some((region) => region.id === "hero")).toBe(true);
      expect(desktop?.regions.some((region) => region.kind === "cta")).toBe(true);
      expect(desktop?.regions.every((region) => region.intensity >= 0.08)).toBe(true);
      expect(desktop?.layout_metrics.document_height_px).toBe(1800);
      expect(desktop?.layout_metrics.viewport_count).toBe(2);
      expect(desktop?.layout_metrics.sections.some((section) => section.id === "services")).toBe(
        true,
      );
      expect(desktop?.layout_metrics.primary_ctas[0]?.estimated_reach_rate).toBeGreaterThan(0);
      expect(existsSync(join(runRoot, "history/w01/heatmap.json"))).toBe(true);
      expect(existsSync(join(runRoot, "screenshots/w01/desktop-heatmap.svg"))).toBe(true);
      const heatmapJson = readFileSync(join(runRoot, "history/w01/heatmap.json"), "utf8");
      expect(heatmapJson).toContain("not real visitor tracking");
      expect(heatmapJson).toContain("They contain no redesign instructions");
    } finally {
      rmSync(runRoot, { recursive: true, force: true });
    }
  });
});
