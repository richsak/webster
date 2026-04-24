import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendEvent, filter, tailN, type EventType, type MemoryEvent } from "../memory.ts";

const EVENT_TYPES: EventType[] = [
  "promote",
  "rollback",
  "skip",
  "regression",
  "gap-detected",
  "verdict-ready",
];

function buildLogPath(testName: string): string {
  return join(tmpdir(), `memory-test-${testName}-${Date.now()}-${randomUUID()}.jsonl`);
}

function removeLog(logPath: string): void {
  if (existsSync(logPath)) {
    rmSync(logPath, { force: true });
  }
}

function createEvent(event: EventType, overrides: Partial<MemoryEvent> = {}): MemoryEvent {
  return {
    ts: "2026-04-23T00:00:00.000Z",
    week: "2026-W17",
    actor: "planner",
    event,
    refs: {},
    insight: `${event} insight`,
    ...overrides,
  };
}

describe("memory substrate", () => {
  test("round-trips all event types through JSON", () => {
    const events = EVENT_TYPES.map((event, index) =>
      createEvent(event, {
        ts: `2026-04-23T00:00:0${index}.000Z`,
        actor: `actor-${index}`,
        refs: { ref_id: `ref-${index}` },
        insight: `insight-${event}`,
      }),
    );

    const roundTrip = JSON.parse(JSON.stringify(events)) as MemoryEvent[];

    expect(roundTrip).toEqual(events);
  });

  test("appends three events and reads them back with tailN", () => {
    const logPath = buildLogPath("append-read");
    const events = [
      createEvent("promote", { ts: "2026-04-23T00:00:01.000Z" }),
      createEvent("rollback", { ts: "2026-04-23T00:00:02.000Z", actor: "apply" }),
      createEvent("verdict-ready", { ts: "2026-04-23T00:00:03.000Z", actor: "verdict" }),
    ];

    try {
      for (const event of events) {
        appendEvent(event, logPath);
      }

      expect(tailN(3, logPath)).toEqual(events);
    } finally {
      removeLog(logPath);
    }
  });

  test("deduplicates identical events when refs.exp_id is present", () => {
    const logPath = buildLogPath("idempotent");
    const event = createEvent("promote", {
      refs: { exp_id: "exp-01" },
    });

    try {
      appendEvent(event, logPath);
      appendEvent(event, logPath);

      expect(readFileSync(logPath, "utf8").trim().split("\n")).toHaveLength(1);
    } finally {
      removeLog(logPath);
    }
  });

  test("does not deduplicate when refs.exp_id is absent", () => {
    const logPath = buildLogPath("no-dedup");
    const event = createEvent("skip");

    try {
      appendEvent(event, logPath);
      appendEvent(event, logPath);

      expect(readFileSync(logPath, "utf8").trim().split("\n")).toHaveLength(2);
    } finally {
      removeLog(logPath);
    }
  });

  test("tailN returns the last three events in order", () => {
    const logPath = buildLogPath("tail");
    const events = [
      createEvent("promote", { ts: "2026-04-23T00:00:01.000Z" }),
      createEvent("rollback", { ts: "2026-04-23T00:00:02.000Z" }),
      createEvent("skip", { ts: "2026-04-23T00:00:03.000Z" }),
      createEvent("regression", { ts: "2026-04-23T00:00:04.000Z" }),
      createEvent("verdict-ready", { ts: "2026-04-23T00:00:05.000Z" }),
    ];

    try {
      for (const event of events) {
        appendEvent(event, logPath);
      }

      expect(tailN(3, logPath)).toEqual(events.slice(-3));
    } finally {
      removeLog(logPath);
    }
  });

  test("filter returns only matching actor events", () => {
    const logPath = buildLogPath("filter-actor");
    const events = [
      createEvent("promote", { ts: "2026-04-23T00:00:01.000Z", actor: "planner" }),
      createEvent("rollback", { ts: "2026-04-23T00:00:02.000Z", actor: "apply" }),
      createEvent("skip", { ts: "2026-04-23T00:00:03.000Z", actor: "planner" }),
    ];

    try {
      for (const event of events) {
        appendEvent(event, logPath);
      }

      expect(filter({ actor: "planner" }, logPath)).toEqual(
        events.filter((event) => event.actor === "planner"),
      );
    } finally {
      removeLog(logPath);
    }
  });

  test("filter with empty criteria returns all events", () => {
    const logPath = buildLogPath("filter-all");
    const events = [
      createEvent("promote", { ts: "2026-04-23T00:00:01.000Z" }),
      createEvent("rollback", { ts: "2026-04-23T00:00:02.000Z", actor: "apply" }),
    ];

    try {
      for (const event of events) {
        appendEvent(event, logPath);
      }

      expect(filter({}, logPath)).toEqual(events);
    } finally {
      removeLog(logPath);
    }
  });
});
