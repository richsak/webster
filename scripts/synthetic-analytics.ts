#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { normalizeWebhookBody } from "./analytics-ingestion.ts";
import { validateContextDirectory } from "./context-schema.ts";

const API_BASE = process.env.ANTHROPIC_API_BASE ?? "https://api.anthropic.com";
const API = `${API_BASE.replace(/\/$/, "")}/v1`;
const VERSION = "2023-06-01";
const MODEL = "claude-opus-4-7";

export interface SyntheticAnalyticsInput {
  substrate: "lp" | "site";
  week: number;
  weekDate: string;
  sitePath: string;
  contextPath: string;
  previousAnalytics?: AnalyticsJson;
  seed: string;
}

export interface SectionEngagement {
  section: string;
  views: number;
  avg_time_s: number;
  dropoff_rate: number;
}

export interface PersonaMetric {
  persona_id: string;
  sessions: number;
  bounce_rate: number;
  cta_clicks: number;
  avg_time_s: number;
}

export interface AnalyticsJson {
  version_sha: string;
  site_signature: string;
  substrate: "lp" | "site";
  week: number;
  weekDate: string;
  sessions: number;
  bounce_rate: number;
  avg_time_s: number;
  scroll_depth_25: number;
  scroll_depth_50: number;
  scroll_depth_75: number;
  scroll_depth_100: number;
  cta_clicks: Record<string, number>;
  persona_metrics: PersonaMetric[];
  section_engagement: SectionEngagement[];
  events: { version_sha: string; metric: string; value: number; timestamp: string }[];
}

export interface SyntheticAnalyticsOutput {
  analytics: AnalyticsJson;
  reasoning: string;
}

interface PersonaContext {
  id: string;
  name: string;
  archetype: string;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function readSiteText(sitePath: string): string {
  const files = ["index.html", "services.html", "free-estimate.html"];
  return files
    .map((file) => {
      try {
        return readFileSync(join(sitePath, file), "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return "";
        }
        throw error;
      }
    })
    .join("\n");
}

function loadPersonas(contextPath: string): PersonaContext[] {
  return JSON.parse(readFileSync(join(contextPath, "personas.json"), "utf8")) as PersonaContext[];
}

function scoreSiteState(siteText: string, substrate: "lp" | "site"): number {
  const text = siteText.toLowerCase();
  const positive = [
    "book",
    "discovery",
    "estimate",
    "licensed",
    "insured",
    "warranty",
    "dssci",
    "n&d",
    "testimonial",
    "written scope",
    "owner",
    "schedule",
  ].filter((needle) => text.includes(needle)).length;
  const negative = [
    "learn more",
    "best in the business",
    "times new roman",
    "wellness coaching",
    "maybe someone",
    "top quality",
  ].filter((needle) => text.includes(needle)).length;
  const structure =
    (siteText.match(/<h[1-3]\b/gi)?.length ?? 0) +
    (siteText.match(/<section\b/gi)?.length ?? 0) +
    (siteText.match(/<form\b/gi)?.length ?? 0);
  const pageBonus = substrate === "site" && siteText.includes("free-estimate") ? 0.04 : 0;
  return clamp(
    0.34 + positive * 0.035 + structure * 0.008 + pageBonus - negative * 0.045,
    0.2,
    0.85,
  );
}

function applyContinuity(
  previousValue: number | undefined,
  target: number,
  maxDelta: number,
): number {
  if (previousValue === undefined) {
    return target;
  }
  return clamp(target, previousValue - maxDelta, previousValue + maxDelta);
}

function continuityDelta(
  previousValue: number | undefined,
  fallback: number,
  unchanged: boolean,
): number {
  if (previousValue === undefined) {
    return fallback;
  }
  return unchanged ? Math.abs(previousValue) * 0.05 : fallback;
}

function metricEvents(analytics: Omit<AnalyticsJson, "events">): AnalyticsJson["events"] {
  const timestamp = new Date(`${analytics.weekDate}T12:00:00.000Z`).toISOString();
  const entries = [
    ["sessions", analytics.sessions],
    ["bounce_rate", analytics.bounce_rate],
    ["avg_time_s", analytics.avg_time_s],
    ["scroll_depth_75", analytics.scroll_depth_75],
    ["cta_click", Object.values(analytics.cta_clicks).reduce((sum, value) => sum + value, 0)],
  ] as const;
  return entries.map(([metric, value]) => ({
    version_sha: analytics.version_sha,
    metric,
    value,
    timestamp,
  }));
}

export function generateSyntheticAnalytics(
  input: SyntheticAnalyticsInput,
): SyntheticAnalyticsOutput {
  const contextErrors = validateContextDirectory(input.contextPath);
  if (contextErrors.length > 0) {
    throw new Error(`invalid context: ${contextErrors.join("; ")}`);
  }

  const siteText = readSiteText(input.sitePath);
  const siteSignature = hashString(siteText).toString(16);
  const unchangedSite = input.previousAnalytics?.site_signature === siteSignature;
  const personas = loadPersonas(input.contextPath);
  const score = scoreSiteState(siteText, input.substrate);
  const stableNoise =
    (seededUnit(`${input.seed}:${input.weekDate}:${siteText.length}`) - 0.5) * 0.02;
  const targetSessions = Math.round(
    5000 * (0.98 + seededUnit(`${input.seed}:sessions:${input.week}`) * 0.04),
  );
  const sessions = Math.round(
    applyContinuity(
      input.previousAnalytics?.sessions,
      targetSessions,
      continuityDelta(input.previousAnalytics?.sessions, 750, unchangedSite),
    ),
  );
  const targetBounce = round(clamp(0.82 - score * 0.52 + stableNoise, 0.24, 0.78));
  const bounceRate = round(
    applyContinuity(
      input.previousAnalytics?.bounce_rate,
      targetBounce,
      continuityDelta(input.previousAnalytics?.bounce_rate, 0.15, unchangedSite),
    ),
  );
  const targetTime = round(clamp(42 + score * 145 + stableNoise * 100, 35, 180), 1);
  const avgTime = round(
    applyContinuity(
      input.previousAnalytics?.avg_time_s,
      targetTime,
      continuityDelta(input.previousAnalytics?.avg_time_s, 22, unchangedSite),
    ),
    1,
  );
  const ctaRate = clamp(0.012 + score * 0.095 - bounceRate * 0.025, 0.006, 0.12);
  const primaryCta = input.substrate === "lp" ? "discovery_call" : "free_estimate";
  const totalClicks = Math.round(sessions * ctaRate);

  const baseAnalytics = {
    version_sha: `synthetic-${input.substrate}-w${String(input.week).padStart(2, "0")}-${hashString(
      input.seed + siteText,
    )
      .toString(16)
      .slice(0, 8)}`,
    site_signature: siteSignature,
    substrate: input.substrate,
    week: input.week,
    weekDate: input.weekDate,
    sessions,
    bounce_rate: bounceRate,
    avg_time_s: avgTime,
    scroll_depth_25: round(clamp(0.9 - bounceRate * 0.18, 0.62, 0.96)),
    scroll_depth_50: round(clamp(0.69 - bounceRate * 0.2 + score * 0.1, 0.34, 0.86)),
    scroll_depth_75: round(clamp(0.42 - bounceRate * 0.14 + score * 0.16, 0.18, 0.72)),
    scroll_depth_100: round(clamp(0.18 - bounceRate * 0.06 + score * 0.11, 0.06, 0.42)),
    cta_clicks: { [primaryCta]: totalClicks },
    persona_metrics: personas.map((persona, index) => {
      const share = [0.37, 0.34, 0.29][index] ?? 0.33;
      const personaSessions = Math.round(sessions * share);
      const modifier = (index - 1) * 0.018;
      return {
        persona_id: persona.id,
        sessions: personaSessions,
        bounce_rate: round(clamp(bounceRate + modifier, 0.18, 0.86)),
        cta_clicks: Math.round(totalClicks * share * (1 - modifier)),
        avg_time_s: round(avgTime * (1 - modifier), 1),
      };
    }),
    section_engagement: [
      {
        section: "hero",
        views: sessions,
        avg_time_s: round(avgTime * 0.24, 1),
        dropoff_rate: bounceRate,
      },
      {
        section: input.substrate === "lp" ? "proof" : "services",
        views: Math.round(sessions * (1 - bounceRate * 0.72)),
        avg_time_s: round(avgTime * 0.36, 1),
        dropoff_rate: round(clamp(bounceRate * 0.72, 0.12, 0.64)),
      },
      {
        section: "cta",
        views: Math.round(sessions * (1 - bounceRate) * 0.68),
        avg_time_s: round(avgTime * 0.18, 1),
        dropoff_rate: round(clamp(1 - ctaRate * 4, 0.45, 0.95)),
      },
    ],
  } satisfies Omit<AnalyticsJson, "events">;

  const analytics: AnalyticsJson = { ...baseAnalytics, events: metricEvents(baseAnalytics) };
  normalizeWebhookBody(analytics.events, "cf-pixel");
  const reasoning = buildReasoning(input, personas, score, analytics);
  return { analytics, reasoning };
}

function buildReasoning(
  input: SyntheticAnalyticsInput,
  personas: PersonaContext[],
  score: number,
  analytics: AnalyticsJson,
): string {
  const previous = input.previousAnalytics;
  const movement = previous
    ? `Bounce moved from ${previous.bounce_rate} to ${analytics.bounce_rate}; CTA clicks moved from ${Object.values(previous.cta_clicks).reduce((sum, value) => sum + value, 0)} to ${Object.values(analytics.cta_clicks).reduce((sum, value) => sum + value, 0)}.`
    : "Baseline week: no prior analytics, so metrics are calibrated from current site quality.";
  const personaNotes = personas
    .map(
      (persona, index) =>
        `- ${persona.name}: ${persona.archetype}. Panel response is ${index === 0 ? "trust-led" : index === 1 ? "curiosity-led" : "proof-led"}; current site score ${round(score, 2)} shapes bounce and CTA confidence.`,
    )
    .join("\n");
  return `# Synthetic analytics reasoning — ${input.substrate} week ${input.week}\n\n${movement}\n\n${personaNotes}\n\nContinuity guardrail: unchanged or lightly changed pages are constrained to realistic weekly movement; stronger site-state evidence is required for larger swings. Fixed cohort size is 5000 simulated users.`;
}

function getAPIKey(): string | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  try {
    const key = execFileSync(
      "security",
      ["find-generic-password", "-s", "anthropic-webster", "-a", process.env.USER ?? "", "-w"],
      { encoding: "utf8" },
    ).trim();
    return key || null;
  } catch {
    return null;
  }
}

export async function requestOpusReview(
  input: SyntheticAnalyticsInput,
  output: SyntheticAnalyticsOutput,
): Promise<void> {
  const apiKey = getAPIKey();
  if (!apiKey || process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW === "0") {
    return;
  }
  await fetch(`${API}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system:
        "You are Webster's Synthetic Analytics Agent reviewer. Check whether generated synthetic analytics are plausible for a 5000-user persona panel. Return concise concerns only.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                "Review these generated Webster synthetic analytics for plausibility.",
                "Return only concise concerns; return 'No concerns' if the metrics respect the 5000-user panel, persona movement, and continuity guardrails.",
                JSON.stringify(
                  { input, analytics: output.analytics, reasoning: output.reasoning },
                  null,
                  2,
                ),
              ].join("\n\n"),
            },
          ],
        },
      ],
    }),
  });
}

async function main(): Promise<void> {
  const inputPath = Bun.argv[2];
  const outDir = Bun.argv[3] ?? ".";
  if (!inputPath) {
    console.error("Usage: bun scripts/synthetic-analytics.ts <input.json> [out-dir]");
    process.exit(1);
  }
  const input = JSON.parse(readFileSync(inputPath, "utf8")) as SyntheticAnalyticsInput;
  input.sitePath = resolve(input.sitePath);
  input.contextPath = resolve(input.contextPath);
  const output = generateSyntheticAnalytics(input);
  await requestOpusReview(input, output);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "analytics.json"), `${JSON.stringify(output.analytics, null, 2)}\n`);
  writeFileSync(join(outDir, "analytics-reasoning.md"), `${output.reasoning}\n`);
  console.log(`wrote ${join(outDir, "analytics.json")}`);
  console.log(`wrote ${join(outDir, "analytics-reasoning.md")}`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
