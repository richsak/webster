import { describe, expect, test } from "bun:test";
import { normalizeAnalyticsEvent, normalizeWebhookBody, toD1Insert } from "../analytics-ingestion";

describe("analytics ingestion", () => {
  test("normalizes CF pixel proxy metrics", () => {
    expect(
      normalizeAnalyticsEvent({
        version_sha: "abc123",
        metric: "cta_click",
        value: "2",
        timestamp: "2026-04-24T00:00:00.000Z",
      }),
    ).toEqual({
      version_sha: "abc123",
      metric: "cta_click",
      value: 2,
      timestamp: "2026-04-24T00:00:00.000Z",
      tier: "proxy",
      source: "cf-pixel",
    });
  });

  test("classifies conversion metrics as CVR tier", () => {
    expect(normalizeAnalyticsEvent({ sha: "def456", event: "conversion" }).tier).toBe("cvr");
    expect(normalizeAnalyticsEvent({ sha: "def456", event: "booking_completed" }).tier).toBe("cvr");
  });

  test("builds D1 insert statements", () => {
    const event = normalizeAnalyticsEvent({
      version_sha: "abc",
      metric: "scroll_depth",
      value: 75,
    });
    expect(toD1Insert(event)).toEqual({
      sql: "INSERT INTO analytics_events (version_sha, metric, value, timestamp, tier, source) VALUES (?, ?, ?, ?, ?, ?)",
      params: ["abc", "scroll_depth", 75, "1970-01-01T00:00:00.000Z", "proxy", "cf-pixel"],
    });
  });

  test("normalizes PostHog or GA4 event arrays", () => {
    expect(
      normalizeWebhookBody(
        { events: [{ version: "v1", name: "time_on_page", count: 30 }] },
        "posthog",
      ),
    ).toEqual([
      {
        version_sha: "v1",
        metric: "time_on_page",
        value: 30,
        timestamp: "1970-01-01T00:00:00.000Z",
        tier: "proxy",
        source: "posthog",
      },
    ]);
    expect(normalizeWebhookBody([{ sha: "ga4-v1", event: "conversion" }], "ga4")).toEqual([
      {
        version_sha: "ga4-v1",
        metric: "conversion",
        value: 1,
        timestamp: "1970-01-01T00:00:00.000Z",
        tier: "cvr",
        source: "ga4",
      },
    ]);
  });
});
