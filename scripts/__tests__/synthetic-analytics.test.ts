import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizeWebhookBody } from "../analytics-ingestion.ts";
import {
  generateSyntheticAnalytics,
  requestOpusReview,
  type SyntheticAnalyticsInput,
} from "../synthetic-analytics.ts";

function baseInput(sitePath = "demo-landing-page/ugly"): SyntheticAnalyticsInput {
  return {
    substrate: "lp",
    week: 0,
    weekDate: "2026-02-01",
    sitePath,
    contextPath: "demo-landing-page/context",
    seed: "fixed-seed",
  };
}

describe("synthetic analytics", () => {
  test("golden deterministic output for fixed week-0 HTML and seed", () => {
    const first = generateSyntheticAnalytics(baseInput()).analytics;
    const second = generateSyntheticAnalytics(baseInput()).analytics;

    expect(second).toEqual(first);
    expect(first.sessions).toBe(4995);
    expect(first.site_signature).toBe("f3987cbe");
    expect(first.bounce_rate).toBe(0.55);
    expect(first.cta_clicks.discovery_call).toBe(239);
  });

  test("unchanged week-1 site stays within ±5% per metric", () => {
    const week0 = generateSyntheticAnalytics(baseInput()).analytics;
    const week1 = generateSyntheticAnalytics({
      ...baseInput(),
      week: 1,
      weekDate: "2026-02-08",
      previousAnalytics: week0,
    }).analytics;

    expect(week1.site_signature).toBe(week0.site_signature);
    expect(Math.abs(week1.sessions - week0.sessions)).toBeLessThanOrEqual(week0.sessions * 0.05);
    expect(Math.abs(week1.bounce_rate - week0.bounce_rate)).toBeLessThanOrEqual(
      week0.bounce_rate * 0.05,
    );
    expect(Math.abs(week1.avg_time_s - week0.avg_time_s)).toBeLessThanOrEqual(
      week0.avg_time_s * 0.05,
    );
  });

  test("hero copy improvement drops bounce 5-20% with reasoning", () => {
    const dir = mkdtempSync(join(tmpdir(), "webster-synth-site-"));
    writeFileSync(
      join(dir, "index.html"),
      `<h1>Book a Discovery Call for N&D Certification</h1><section><h2>Licensed clinic training with written scope</h2><p>Dr. Nicolette Richer, dssci, helps clinic teams reduce patient churn with credible food-as-medicine training.</p><p>Owner-led schedule, insured facilitation, warranty-backed implementation support, and testimonial proof.</p><a>Book a Discovery Call</a></section><section><h2>Patient churn proof</h2><p>Discovery call, N&D roadmap, written scope, and schedule clarity.</p></section>`,
    );
    const week0 = generateSyntheticAnalytics(baseInput()).analytics;
    const improved = generateSyntheticAnalytics({
      ...baseInput(dir),
      week: 1,
      weekDate: "2026-02-08",
      previousAnalytics: week0,
    });

    const drop = week0.bounce_rate - improved.analytics.bounce_rate;
    expect(drop).toBeGreaterThanOrEqual(0.05);
    expect(drop).toBeLessThanOrEqual(0.2);
    expect(improved.reasoning).toContain("Bounce moved");
    expect(improved.reasoning).toContain("Fixed cohort size is 5000 simulated users");
  });

  test("analytics events are compatible with ingestion normalizer", () => {
    const analytics = generateSyntheticAnalytics(baseInput()).analytics;
    const normalized = normalizeWebhookBody(analytics.events, "cf-pixel");

    expect(normalized.length).toBeGreaterThan(0);
    expect(normalized.every((event) => event.version_sha === analytics.version_sha)).toBe(true);
    expect(normalized.some((event) => event.metric === "cta_click")).toBe(true);
  });

  test("CLI writes analytics.json and analytics-reasoning.md", async () => {
    const dir = mkdtempSync(join(tmpdir(), "webster-synth-out-"));
    const inputPath = join(dir, "input.json");
    writeFileSync(inputPath, JSON.stringify(baseInput(), null, 2));

    const proc = Bun.spawnSync(["bun", "scripts/synthetic-analytics.ts", inputPath, dir], {
      env: { ...process.env, WEBSTER_SYNTHETIC_ANALYTICS_REVIEW: "0" },
      stdout: "pipe",
      stderr: "pipe",
    });

    expect(proc.exitCode).toBe(0);
    expect(JSON.parse(readFileSync(join(dir, "analytics.json"), "utf8"))).toMatchObject({
      substrate: "lp",
      week: 0,
    });
    expect(readFileSync(join(dir, "analytics-reasoning.md"), "utf8")).toContain(
      "Synthetic analytics reasoning",
    );
  });

  test("Opus review uses /v1/messages when API key is available", async () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.ANTHROPIC_API_KEY;
    const originalReview = process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW;
    const urls: string[] = [];
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ content: [] }), { status: 200 });
    }) as typeof fetch;

    try {
      const input = baseInput();
      await requestOpusReview(input, generateSyntheticAnalytics(input));
      expect(urls).toEqual(["https://api.anthropic.com/v1/messages"]);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalKey === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
      if (originalReview === undefined) {
        delete process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW;
      } else {
        process.env.WEBSTER_SYNTHETIC_ANALYTICS_REVIEW = originalReview;
      }
    }
  });
});
