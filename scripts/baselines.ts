#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type BaselineStatus =
  | "promoted"
  | "archived-gate-fail"
  | "rolled-back"
  | "holding"
  | `skipped-${string}`;

export interface ExperimentBaselineRow {
  exp_id: string;
  week: string;
  version_sha: string;
  experiment_sha: string;
  proposal_ref: string;
  decision_ref: string;
  baseline_window: string;
  status: BaselineStatus;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid baseline row field: ${field}`);
  }
  return value;
}

function parseStatus(value: unknown): BaselineStatus {
  const status = expectString(value, "status");
  if (
    status === "promoted" ||
    status === "archived-gate-fail" ||
    status === "rolled-back" ||
    status === "holding" ||
    status.startsWith("skipped-")
  ) {
    return status as BaselineStatus;
  }
  throw new Error(`Invalid baseline status: ${status}`);
}

export function parseBaselineRow(value: unknown): ExperimentBaselineRow {
  if (!isRecord(value)) {
    throw new Error("Baseline row must be an object");
  }
  return {
    exp_id: expectString(value.exp_id, "exp_id"),
    week: expectString(value.week, "week"),
    version_sha: expectString(value.version_sha, "version_sha"),
    experiment_sha: expectString(value.experiment_sha, "experiment_sha"),
    proposal_ref: expectString(value.proposal_ref, "proposal_ref"),
    decision_ref: expectString(value.decision_ref, "decision_ref"),
    baseline_window: expectString(value.baseline_window, "baseline_window"),
    status: parseStatus(value.status),
  };
}

export function appendBaselineRow(path: string, row: ExperimentBaselineRow): void {
  const parsed = parseBaselineRow(row);
  mkdirSync(dirname(path), { recursive: true });
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  writeFileSync(path, `${prefix}${JSON.stringify(parsed)}\n`);
}

export function readBaselineRows(path: string): ExperimentBaselineRow[] {
  if (!existsSync(path)) {
    return [];
  }
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => parseBaselineRow(JSON.parse(line)));
}

export interface BaselinePromotion {
  exp_id: string;
  promoted_sha: string;
  archived_sha?: string;
  sustained_weeks: number;
  event: "promote";
}

export function planBaselinePromotion(
  rows: ExperimentBaselineRow[],
  expId: string,
  sustainedWeeks = 2,
): BaselinePromotion | undefined {
  const matching = rows.filter((row) => row.exp_id === expId);
  const recentPromoted = matching.filter((row) => row.status === "promoted").slice(-sustainedWeeks);
  if (recentPromoted.length < sustainedWeeks) {
    return undefined;
  }

  const latest = recentPromoted[recentPromoted.length - 1] as ExperimentBaselineRow;
  const previous = recentPromoted[recentPromoted.length - 2];
  return {
    exp_id: expId,
    promoted_sha: latest.version_sha,
    archived_sha: previous?.version_sha,
    sustained_weeks: sustainedWeeks,
    event: "promote",
  };
}

export function writeBaselinePromotionEvent(path: string, promotion: BaselinePromotion): void {
  mkdirSync(dirname(path), { recursive: true });
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const prefix = existing.length === 0 || existing.endsWith("\n") ? existing : `${existing}\n`;
  writeFileSync(
    path,
    `${prefix}${JSON.stringify({ ts: new Date().toISOString(), actor: "baseline-promoter", ...promotion })}\n`,
  );
}
