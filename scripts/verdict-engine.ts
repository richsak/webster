#!/usr/bin/env bun

import type { NormalizedAnalyticsEvent } from "./analytics-ingestion";

export type VerdictLane =
  | "fast-track-promote"
  | "fallback-promote"
  | "gate-win"
  | "archive-gate-fail"
  | "auto-rollback"
  | "hold"
  | "hold-weak-negative";

export interface ExperimentVerdict {
  exp_id: string;
  verdict: "promote" | "archive" | "rollback" | "hold";
  confidence: number;
  reward_delta: number;
  gate_status: { gate: string; passed: boolean; delta?: number }[];
  lane: VerdictLane;
}

export function sumMetric(events: NormalizedAnalyticsEvent[], metric: string): number {
  return events
    .filter((event) => event.metric === metric)
    .reduce((total, event) => total + event.value, 0);
}

function ctr(events: NormalizedAnalyticsEvent[]): number {
  const views = sumMetric(events, "page_view");
  const clicks = sumMetric(events, "cta_click");
  return views <= 0 ? 0 : clicks / views;
}

function confidenceFromDelta(delta: number): number {
  return Math.min(0.99, Math.max(0.5, 0.5 + Math.abs(delta) * 10));
}

export function verdictForExperiment(
  expId: string,
  baselineEvents: NormalizedAnalyticsEvent[],
  currentEvents: NormalizedAnalyticsEvent[],
): ExperimentVerdict {
  const baselineCtr = ctr(baselineEvents);
  const currentCtr = ctr(currentEvents);
  const rewardDelta = currentCtr - baselineCtr;
  const bounceDelta =
    sumMetric(currentEvents, "bounce_rate") - sumMetric(baselineEvents, "bounce_rate");
  const scrollDelta =
    sumMetric(currentEvents, "scroll_depth") - sumMetric(baselineEvents, "scroll_depth");
  const gateStatus = [
    { gate: "bounce-ceiling", passed: bounceDelta <= 0, delta: bounceDelta },
    { gate: "scroll-floor", passed: scrollDelta >= 0, delta: scrollDelta },
  ];
  const gatesPassed = gateStatus.every((gate) => gate.passed);
  const confidence = confidenceFromDelta(rewardDelta);

  if (rewardDelta <= -0.01 && confidence >= 0.6) {
    return {
      exp_id: expId,
      verdict: "rollback",
      confidence,
      reward_delta: rewardDelta,
      gate_status: gateStatus,
      lane: "auto-rollback",
    };
  }
  if (!gatesPassed && rewardDelta > 0) {
    return {
      exp_id: expId,
      verdict: "archive",
      confidence,
      reward_delta: rewardDelta,
      gate_status: gateStatus,
      lane: "archive-gate-fail",
    };
  }
  if (rewardDelta >= 0.01 && confidence >= 0.6 && gatesPassed) {
    return {
      exp_id: expId,
      verdict: "promote",
      confidence,
      reward_delta: rewardDelta,
      gate_status: gateStatus,
      lane: "fast-track-promote",
    };
  }
  if (rewardDelta > 0 && gatesPassed) {
    return {
      exp_id: expId,
      verdict: "promote",
      confidence,
      reward_delta: rewardDelta,
      gate_status: gateStatus,
      lane: "fallback-promote",
    };
  }
  if (rewardDelta < 0) {
    return {
      exp_id: expId,
      verdict: "hold",
      confidence,
      reward_delta: rewardDelta,
      gate_status: gateStatus,
      lane: "hold-weak-negative",
    };
  }
  if (gatesPassed && gateStatus.some((gate) => (gate.delta ?? 0) !== 0)) {
    return {
      exp_id: expId,
      verdict: "promote",
      confidence,
      reward_delta: rewardDelta,
      gate_status: gateStatus,
      lane: "gate-win",
    };
  }
  return {
    exp_id: expId,
    verdict: "hold",
    confidence,
    reward_delta: rewardDelta,
    gate_status: gateStatus,
    lane: "hold",
  };
}

export function crossExperimentPageCtrGate(
  baselineEvents: NormalizedAnalyticsEvent[],
  currentEvents: NormalizedAnalyticsEvent[],
): { passed: boolean; reward_delta: number } {
  const rewardDelta = ctr(currentEvents) - ctr(baselineEvents);
  return { passed: rewardDelta > -0.005, reward_delta: rewardDelta };
}
