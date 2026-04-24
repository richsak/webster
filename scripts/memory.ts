// ORCHESTRATOR-ONLY: agents must not import this module directly (ADR-0001)

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
