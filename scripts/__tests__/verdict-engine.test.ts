import { describe, expect, test } from "bun:test";
import type { NormalizedAnalyticsEvent } from "../analytics-ingestion";
import { crossExperimentPageCtrGate, verdictForExperiment } from "../verdict-engine";

function event(metric: string, value: number): NormalizedAnalyticsEvent {
  return {
    version_sha: "sha",
    metric,
    value,
    timestamp: "2026-04-24T00:00:00.000Z",
    tier: metric === "conversion" ? "cvr" : "proxy",
    source: "cf-pixel",
  };
}

describe("verdict engine", () => {
  test("fast-track promotes positive reward with passing gates", () => {
    expect(
      verdictForExperiment(
        "exp-01",
        [
          event("page_view", 100),
          event("cta_click", 4),
          event("bounce_rate", 60),
          event("scroll_depth", 50),
        ],
        [
          event("page_view", 100),
          event("cta_click", 8),
          event("bounce_rate", 55),
          event("scroll_depth", 55),
        ],
      ),
    ).toMatchObject({ verdict: "promote", lane: "fast-track-promote" });
  });

  test("auto-rolls back negative reward", () => {
    expect(
      verdictForExperiment(
        "exp-02",
        [event("page_view", 100), event("cta_click", 8)],
        [event("page_view", 100), event("cta_click", 2)],
      ),
    ).toMatchObject({ verdict: "rollback", lane: "auto-rollback" });
  });

  test("archives gate failures even when reward improves", () => {
    expect(
      verdictForExperiment(
        "exp-03",
        [
          event("page_view", 100),
          event("cta_click", 4),
          event("bounce_rate", 40),
          event("scroll_depth", 50),
        ],
        [
          event("page_view", 100),
          event("cta_click", 7),
          event("bounce_rate", 50),
          event("scroll_depth", 55),
        ],
      ),
    ).toMatchObject({ verdict: "archive", lane: "archive-gate-fail" });
  });

  test("promotes gate wins when reward is flat and gates improve", () => {
    expect(
      verdictForExperiment(
        "exp-04",
        [
          event("page_view", 100),
          event("cta_click", 4),
          event("bounce_rate", 60),
          event("scroll_depth", 50),
        ],
        [
          event("page_view", 100),
          event("cta_click", 4),
          event("bounce_rate", 55),
          event("scroll_depth", 55),
        ],
      ),
    ).toMatchObject({ verdict: "promote", lane: "gate-win" });
  });

  test("applies cross-experiment page CTR gate", () => {
    expect(
      crossExperimentPageCtrGate(
        [event("page_view", 100), event("cta_click", 10)],
        [event("page_view", 100), event("cta_click", 8)],
      ),
    ).toEqual({
      passed: false,
      reward_delta: -0.020000000000000004,
    });
  });
});
