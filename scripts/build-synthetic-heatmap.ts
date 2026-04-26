#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { AnalyticsJson, SectionEngagement } from "./synthetic-analytics.ts";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LayoutSection {
  id: string;
  label: string;
  source: "explicit" | "inferred";
  rect: Rect;
}

interface LayoutCta {
  id: string;
  text: string;
  href: string;
  rect: Rect;
}

interface BreakpointLayout {
  breakpoint: string;
  width: number;
  height: number;
  document_height: number;
  sections: LayoutSection[];
  ctas: LayoutCta[];
}

interface LayoutMap {
  breakpoints: BreakpointLayout[];
}

interface HeatmapRegion {
  kind: "section" | "cta";
  id: string;
  label: string;
  rect: Rect;
  intensity: number;
  reason: string;
}

interface SectionReachMetric {
  id: string;
  label: string;
  top_px: number;
  height_px: number;
  height_share: number;
  estimated_reach_rate: number;
  source: "section_engagement" | "scroll_curve";
}

interface CtaReachMetric {
  id: string;
  label: string;
  top_px: number;
  order: number;
  estimated_reach_rate: number;
  estimated_click_rate: number;
}

interface BreakpointLayoutMetrics {
  document_height_px: number;
  viewport_height_px: number;
  viewport_count: number;
  scroll_depth_25: number;
  scroll_depth_50: number;
  scroll_depth_75: number;
  scroll_depth_100: number;
  sections: SectionReachMetric[];
  primary_ctas: CtaReachMetric[];
}

interface BreakpointHeatmap {
  breakpoint: string;
  width: number;
  document_height: number;
  layout_metrics: BreakpointLayoutMetrics;
  regions: HeatmapRegion[];
  svg: string;
}

interface HeatmapOutput {
  week: string;
  synthetic: true;
  model: "layout-map-plus-analytics-v2";
  disclaimer: string;
  measurement_note: string;
  analytics_version_sha: string;
  sessions: number;
  breakpoints: BreakpointHeatmap[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function totalClicks(analytics: AnalyticsJson): number {
  return Object.values(analytics.cta_clicks).reduce((sum, value) => sum + value, 0);
}

function sectionKey(id: string): string {
  const normalized = id.toLowerCase();
  if (normalized.includes("hero")) {
    return "hero";
  }
  if (
    normalized.includes("proof") ||
    normalized.includes("about") ||
    normalized.includes("credential") ||
    normalized.includes("lineage")
  ) {
    return "proof";
  }
  if (normalized.includes("service")) {
    return "services";
  }
  if (normalized.includes("contact") || normalized.includes("cta")) {
    return "cta";
  }
  return normalized;
}

function matchingEngagement(
  section: LayoutSection,
  analytics: AnalyticsJson,
): SectionEngagement | undefined {
  const key = sectionKey(section.id);
  return analytics.section_engagement.find((engagement) => sectionKey(engagement.section) === key);
}

function isPrimaryHeatmapCta(cta: LayoutCta): boolean {
  if (cta.id === "discovery_call" || cta.id === "free_estimate") {
    return true;
  }
  return /book|learn more|submit|send my request|schedule|estimate/i.test(cta.text);
}

function foldWeight(rect: Rect, viewportHeight: number): number {
  const midpoint = rect.y + rect.height / 2;
  if (midpoint <= viewportHeight) {
    return 1;
  }
  return clamp(1 - (midpoint - viewportHeight) / Math.max(viewportHeight * 2.5, 1), 0.28, 0.92);
}

function estimateReachAtY(y: number, layout: BreakpointLayout, analytics: AnalyticsJson): number {
  if (y <= layout.height) {
    return 1;
  }
  const scrollFraction = clamp(y / Math.max(layout.document_height, 1), 0, 1);
  const curve = [
    { depth: 0, reach: 1 },
    { depth: 0.25, reach: analytics.scroll_depth_25 },
    { depth: 0.5, reach: analytics.scroll_depth_50 },
    { depth: 0.75, reach: analytics.scroll_depth_75 },
    { depth: 1, reach: analytics.scroll_depth_100 },
  ];
  for (let index = 1; index < curve.length; index++) {
    const previous = curve[index - 1];
    const next = curve[index];
    if (!previous || !next) {
      continue;
    }
    if (scrollFraction <= next.depth) {
      const progress = (scrollFraction - previous.depth) / Math.max(next.depth - previous.depth, 1);
      return round(previous.reach + (next.reach - previous.reach) * progress);
    }
  }
  return analytics.scroll_depth_100;
}

function buildLayoutMetrics(
  layout: BreakpointLayout,
  analytics: AnalyticsJson,
  primaryCtas: LayoutCta[],
): BreakpointLayoutMetrics {
  return {
    document_height_px: layout.document_height,
    viewport_height_px: layout.height,
    viewport_count: round(layout.document_height / Math.max(layout.height, 1), 2),
    scroll_depth_25: analytics.scroll_depth_25,
    scroll_depth_50: analytics.scroll_depth_50,
    scroll_depth_75: analytics.scroll_depth_75,
    scroll_depth_100: analytics.scroll_depth_100,
    sections: layout.sections.map((section) => {
      const engagement = matchingEngagement(section, analytics);
      return {
        id: section.id,
        label: section.label,
        top_px: Math.round(section.rect.y),
        height_px: Math.round(section.rect.height),
        height_share: round(section.rect.height / Math.max(layout.document_height, 1)),
        estimated_reach_rate: engagement
          ? round(engagement.views / Math.max(analytics.sessions, 1))
          : estimateReachAtY(section.rect.y, layout, analytics),
        source: engagement ? "section_engagement" : "scroll_curve",
      };
    }),
    primary_ctas: primaryCtas.map((cta, index) => ({
      id: cta.id,
      label: cta.text,
      top_px: Math.round(cta.rect.y),
      order: index + 1,
      estimated_reach_rate: estimateReachAtY(cta.rect.y, layout, analytics),
      estimated_click_rate: round(totalClicks(analytics) / Math.max(analytics.sessions, 1)),
    })),
  };
}

function sectionIntensity(
  section: LayoutSection,
  analytics: AnalyticsJson,
  viewportHeight: number,
): { intensity: number; reason: string } {
  const engagement = matchingEngagement(section, analytics);
  if (!engagement) {
    const fallback = round(0.22 * foldWeight(section.rect, viewportHeight));
    return {
      intensity: fallback,
      reason: "No direct section_engagement row; fallback layout attention.",
    };
  }
  const viewShare = engagement.views / Math.max(analytics.sessions, 1);
  const timeShare = engagement.avg_time_s / Math.max(analytics.avg_time_s, 1);
  const retained = 1 - engagement.dropoff_rate;
  const weighted =
    (viewShare * 0.48 + timeShare * 0.22 + retained * 0.3) *
    foldWeight(section.rect, viewportHeight);
  return {
    intensity: round(clamp(weighted, 0.08, 0.92)),
    reason: `${engagement.section}: views=${engagement.views}, avg_time_s=${engagement.avg_time_s}, dropoff_rate=${engagement.dropoff_rate}.`,
  };
}

function ctaIntensity(
  cta: LayoutCta,
  analytics: AnalyticsJson,
  viewportHeight: number,
  index: number,
): HeatmapRegion {
  const clickRate = totalClicks(analytics) / Math.max(analytics.sessions, 1);
  const visibleBoost = foldWeight(cta.rect, viewportHeight);
  const orderShare = [1, 0.68, 0.42, 0.25][index] ?? 0.18;
  const intentBoost = cta.id === "discovery_call" || cta.id === "free_estimate" ? 1 : 0.62;
  const intensity = round(
    clamp(0.18 + clickRate * 8.8 * visibleBoost * orderShare * intentBoost, 0.12, 0.9),
  );
  return {
    kind: "cta",
    id: cta.id,
    label: cta.text,
    rect: cta.rect,
    intensity,
    reason: `CTA hotspot weighted by position ${index + 1}, viewport visibility, and ${totalClicks(analytics)} synthetic clicks across ${analytics.sessions} sessions.`,
  };
}

function regionColor(region: HeatmapRegion): string {
  if (region.kind === "cta") {
    return "#dc2626";
  }
  if (region.intensity >= 0.62) {
    return "#f97316";
  }
  if (region.intensity >= 0.38) {
    return "#f59e0b";
  }
  return "#facc15";
}

function buildSvg(layout: BreakpointLayout, regions: HeatmapRegion[]): string {
  const height = Math.max(layout.document_height, layout.height);
  const regionShapes = regions
    .map((region) => {
      const color = regionColor(region);
      const label = escapeXml(`${region.id} ${Math.round(region.intensity * 100)}%`);
      const centerX = region.rect.x + region.rect.width / 2;
      const centerY =
        region.kind === "cta"
          ? region.rect.y + region.rect.height / 2
          : region.rect.y + Math.min(region.rect.height * 0.34, layout.height * 0.55);
      const radiusX = Math.max(region.rect.width * (region.kind === "cta" ? 0.85 : 0.42), 80);
      const radiusY = Math.max(region.rect.height * (region.kind === "cta" ? 1.8 : 0.18), 42);
      const rectOpacity = round(
        clamp(region.intensity * (region.kind === "cta" ? 0.16 : 0.22), 0.03, 0.2),
        2,
      );
      const coreOpacity = round(
        clamp(region.intensity * (region.kind === "cta" ? 0.82 : 0.62), 0.08, 0.78),
        2,
      );
      const haloOpacity = round(clamp(region.intensity * 0.24, 0.04, 0.24), 2);
      return [
        `<rect x="${region.rect.x}" y="${region.rect.y}" width="${region.rect.width}" height="${region.rect.height}" rx="18" fill="${color}" opacity="${rectOpacity}"/>`,
        `<ellipse cx="${round(centerX, 1)}" cy="${round(centerY, 1)}" rx="${round(radiusX * 1.45, 1)}" ry="${round(radiusY * 1.45, 1)}" fill="${color}" opacity="${haloOpacity}"/>`,
        `<ellipse cx="${round(centerX, 1)}" cy="${round(centerY, 1)}" rx="${round(radiusX, 1)}" ry="${round(radiusY, 1)}" fill="${color}" opacity="${coreOpacity}"/>`,
        `<text x="${region.rect.x + 12}" y="${region.rect.y + 28}" fill="#1f2937" font-family="Arial" font-size="16" font-weight="700">${label}</text>`,
      ].join("\n");
    })
    .join("\n");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${height}" viewBox="0 0 ${layout.width} ${height}">`,
    `<rect width="100%" height="100%" fill="#fff7ed"/>`,
    `<text x="24" y="36" fill="#7c2d12" font-family="Arial" font-size="22" font-weight="700">Synthetic heatmap — ${escapeXml(layout.breakpoint)}</text>`,
    `<text x="24" y="62" fill="#9a3412" font-family="Arial" font-size="14">Mock attention overlay from layout-map.json + analytics.section_engagement; not real user tracking.</text>`,
    regionShapes,
    `</svg>`,
  ].join("\n");
}

export function buildSyntheticHeatmap(runRoot: string, week: string): HeatmapOutput {
  const screenshotDir = join(runRoot, "screenshots", week);
  const historyDir = join(runRoot, "history", week);
  const layoutPath = join(screenshotDir, "layout-map.json");
  const analyticsPath = join(historyDir, "analytics.json");
  const layout = JSON.parse(readFileSync(layoutPath, "utf8")) as LayoutMap;
  const analytics = JSON.parse(readFileSync(analyticsPath, "utf8")) as AnalyticsJson;
  const breakpoints = layout.breakpoints.map((breakpoint) => {
    const sectionRegions = breakpoint.sections.map((section) => {
      const scored = sectionIntensity(section, analytics, breakpoint.height);
      return {
        kind: "section" as const,
        id: section.id,
        label: section.label,
        rect: section.rect,
        intensity: scored.intensity,
        reason: scored.reason,
      };
    });
    const primaryCtas = breakpoint.ctas.filter(isPrimaryHeatmapCta).slice(0, 6);
    const ctaRegions = primaryCtas.map((cta, index) =>
      ctaIntensity(cta, analytics, breakpoint.height, index),
    );
    const regions = [...sectionRegions, ...ctaRegions].sort((a, b) => b.intensity - a.intensity);
    const svgName = `${breakpoint.breakpoint}-heatmap.svg`;
    const svg = buildSvg(breakpoint, regions);
    writeFileSync(join(screenshotDir, svgName), `${svg}\n`);
    return {
      breakpoint: breakpoint.breakpoint,
      width: breakpoint.width,
      document_height: breakpoint.document_height,
      layout_metrics: buildLayoutMetrics(breakpoint, analytics, primaryCtas),
      regions,
      svg: join("screenshots", week, svgName),
    };
  });
  const output: HeatmapOutput = {
    week,
    synthetic: true,
    model: "layout-map-plus-analytics-v2",
    disclaimer:
      "Synthetic heatmap for local demo only. It maps mocked section engagement and CTA clicks onto measured DOM rectangles; it is not real visitor tracking.",
    measurement_note:
      "Layout metrics are neutral measurements derived from DOM geometry, synthetic scroll depth, section engagement, and CTA click counts. They contain no redesign instructions.",
    analytics_version_sha: analytics.version_sha,
    sessions: analytics.sessions,
    breakpoints,
  };
  writeFileSync(join(historyDir, "heatmap.json"), `${JSON.stringify(output, null, 2)}\n`);
  return output;
}

function main(): void {
  const runRoot = Bun.argv[2];
  const week = Bun.argv[3];
  if (!runRoot || !week) {
    console.error("Usage: bun scripts/build-synthetic-heatmap.ts <run-root> <week>");
    process.exit(1);
  }
  const screenshotDir = join(runRoot, "screenshots", week);
  const historyDir = join(runRoot, "history", week);
  if (!existsSync(screenshotDir) || !existsSync(historyDir)) {
    throw new Error(`missing screenshot/history directories for ${basename(runRoot)} ${week}`);
  }
  mkdirSync(historyDir, { recursive: true });
  const output = buildSyntheticHeatmap(runRoot, week);
  console.log(`wrote ${join(historyDir, "heatmap.json")}`);
  for (const breakpoint of output.breakpoints) {
    console.log(`wrote ${join(runRoot, breakpoint.svg)}`);
  }
}

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
