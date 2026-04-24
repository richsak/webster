// ORCHESTRATOR-ONLY: agents must not import this module directly (ADR-0001)

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type EventType =
  | "promote"
  | "rollback"
  | "skip"
  | "regression"
  | "gap-detected"
  | "verdict-ready"
  | "origin";

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

function readEvents(logPath: string): MemoryEvent[] {
  if (!existsSync(logPath)) {
    return [];
  }

  return readFileSync(logPath, "utf8")
    .split("\n")
    .flatMap((line, index) => {
      if (line.length === 0) {
        return [];
      }

      try {
        return [JSON.parse(line) as MemoryEvent];
      } catch {
        throw new Error(`Malformed memory event at line ${index + 1} in ${logPath}`);
      }
    });
}

function hasDuplicateEvent(event: MemoryEvent, logPath: string): boolean {
  const expId = event.refs.exp_id;
  if (!expId) {
    return false;
  }

  return readEvents(logPath).some((existing) => {
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

export function tailN(
  n: number,
  logPath = resolve(process.cwd(), "history", "memory.jsonl"),
): MemoryEvent[] {
  if (n === 0) {
    return [];
  }

  const events = readEvents(logPath);
  if (n >= events.length) {
    return events;
  }

  return events.slice(-n);
}

export function filter(
  criteria: MemoryFilter,
  logPath = resolve(process.cwd(), "history", "memory.jsonl"),
): MemoryEvent[] {
  const events = readEvents(logPath);
  return events.filter((event) => {
    return Object.entries(criteria).every(
      ([key, value]) => event[key as keyof MemoryFilter] === value,
    );
  });
}
