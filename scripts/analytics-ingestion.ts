#!/usr/bin/env bun

export type MetricTier = "proxy" | "cvr";

export interface NormalizedAnalyticsEvent {
  version_sha: string;
  metric: string;
  value: number;
  timestamp: string;
  tier: MetricTier;
  source: "cf-pixel" | "posthog" | "ga4";
}

function expectString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function expectNumber(value: unknown, fallback = 1): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0 && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function tierForMetric(metric: string): MetricTier {
  return metric === "conversion" || metric === "booking_completed" ? "cvr" : "proxy";
}

export function normalizeAnalyticsEvent(
  input: Record<string, unknown>,
  source: NormalizedAnalyticsEvent["source"] = "cf-pixel",
): NormalizedAnalyticsEvent {
  const metric = expectString(input.metric ?? input.event ?? input.name, "page_view");
  return {
    version_sha: expectString(input.version_sha ?? input.version ?? input.sha, "unknown"),
    metric,
    value: expectNumber(input.value ?? input.count, 1),
    timestamp: expectString(input.timestamp ?? input.ts, new Date(0).toISOString()),
    tier: tierForMetric(metric),
    source,
  };
}

export function toD1Insert(event: NormalizedAnalyticsEvent): { sql: string; params: unknown[] } {
  return {
    sql: "INSERT INTO analytics_events (version_sha, metric, value, timestamp, tier, source) VALUES (?, ?, ?, ?, ?, ?)",
    params: [
      event.version_sha,
      event.metric,
      event.value,
      event.timestamp,
      event.tier,
      event.source,
    ],
  };
}

export function normalizeWebhookBody(
  body: unknown,
  source: NormalizedAnalyticsEvent["source"],
): NormalizedAnalyticsEvent[] {
  if (Array.isArray(body)) {
    return body.map((event) => normalizeAnalyticsEvent(event as Record<string, unknown>, source));
  }
  if (
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as { events?: unknown }).events)
  ) {
    return (body as { events: unknown[] }).events.map((event) =>
      normalizeAnalyticsEvent(event as Record<string, unknown>, source),
    );
  }
  return [normalizeAnalyticsEvent((body ?? {}) as Record<string, unknown>, source)];
}
