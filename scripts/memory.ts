// ORCHESTRATOR-ONLY: agents must not import this module directly (ADR-0001)

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type EventType =
  | "promote"
  | "rollback"
  | "skip"
  | "regression"
  | "gap-detected"
  | "verdict-ready";

export type EventRefs = Record<string, string>;

export interface MemoryEvent {
  ts: string;
  week: string;
  actor: string;
  event: EventType;
  refs: EventRefs;
  insight: string;
}

export type MemoryFilter = Partial<Pick<MemoryEvent, "week" | "actor" | "event">>;

function hasDuplicateEvent(event: MemoryEvent, logPath: string): boolean {
  const expId = event.refs.exp_id;
  if (!expId || !existsSync(logPath)) {
    return false;
  }

  const lines = readFileSync(logPath, "utf8")
    .split("\n")
    .filter((line) => line.length > 0);

  return lines.some((line) => {
    const existing = JSON.parse(line) as MemoryEvent;
    return (
      existing.ts === event.ts &&
      existing.week === event.week &&
      existing.actor === event.actor &&
      existing.event === event.event &&
      existing.refs.exp_id === expId
    );
  });
}

export function appendEvent(
  event: MemoryEvent,
  logPath = resolve(process.cwd(), "history", "memory.jsonl"),
): void {
  mkdirSync(dirname(logPath), { recursive: true });
  if (hasDuplicateEvent(event, logPath)) {
    return;
  }

  appendFileSync(logPath, `${JSON.stringify(event)}\n`);
}
