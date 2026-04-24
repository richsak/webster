# Memory Substrate Schema + Append Helper — Product Requirements

## Overview

**Problem**: The orchestrator has no structured way to record what happened each week. Without a curated event log, the planner at week N+1 would have to re-read 12 weeks of raw findings and verdicts — overwhelming its context window and losing signal in noise.

**Solution**: A JSONL event log at `history/memory.jsonl` with a typed schema, an append helper (write one event), and reader helpers (tail, filter). The orchestrator is the sole caller — agents never touch this file directly (ADR-0001).

**Branch**: `feat/memory-substrate`

---

## Goals & Success

### Primary Goal

Provide a typed, append-only event log that the orchestrator can write to and the planner can read from, giving every subsequent week a curated record of promote/rollback/skip/regression/gap/verdict events.

### Success Metrics

| Metric             | Target                                                  | How Measured                    |
| ------------------ | ------------------------------------------------------- | ------------------------------- |
| Type safety        | Zero `any` without justification                        | `bun run type-check` passes     |
| Idempotency        | Duplicate (ts+week+actor+event+exp_id) row not appended | Unit test for idempotency case  |
| Schema round-trip  | Parse → serialize → re-parse is lossless                | Unit test with full event shape |
| Reader correctness | tailN(3) on 5-event file returns last 3                 | Unit test                       |

### Non-Goals (Out of Scope)

- **Orchestrator marshaling (#52)** — reading memory.jsonl and feeding it to the planner's user-message is a separate story
- **Skip-contract plumbing (#56)** — apply-worker/visual-reviewer skip rows are a separate story
- **Agent direct access** — agents must never import this module (enforced via file header comment)
- **Mutation or deletion** — log is append-only; no update or truncate helpers

---

## User & Context

### Target User

- **Who**: The Webster orchestrator session (bash-in-markdown at `prompts/second-wbs-session.md`)
- **Role**: The single coordinator that runs critics, applies proposals, and tracks outcomes
- **Current Pain**: No structured place to record "what happened this week" — currently ad-hoc or absent

### User Journey

1. **Trigger**: An orchestrator action completes (promote, rollback, skip, regression detected, gap detected, verdict ready)
2. **Action**: Orchestrator calls `appendEvent(event)` with a populated `MemoryEvent` object
3. **Outcome**: One JSON-encoded line is appended to `history/memory.jsonl`; next week's planner reads it via `tailN()` or `filter()`

---

## UX Requirements

### Interaction Model

TypeScript module at `scripts/memory.ts`. No CLI surface — this is an internal library used only by orchestrator scripts.

```typescript
// Write
appendEvent(event: MemoryEvent): void

// Read
tailN(n: number): MemoryEvent[]
filter(criteria: Partial<Pick<MemoryEvent, "week" | "actor" | "event">>): MemoryEvent[]
```

### States to Handle

| State             | Description                                     | Behavior                                             |
| ----------------- | ----------------------------------------------- | ---------------------------------------------------- |
| First write       | `history/memory.jsonl` doesn't exist            | `mkdirSync` + create file on first append            |
| Duplicate event   | Same ts+week+actor+event+exp_id already present | Skip silently (idempotent)                           |
| No exp_id in refs | Idempotency key incomplete                      | Always append (no dedup check)                       |
| Malformed row     | A line in the file isn't valid JSON             | `filter`/`tailN` skip the bad line + propagate error |
| Empty file        | Zero events                                     | `tailN` returns `[]`; `filter` returns `[]`          |

---

## Technical Context

### Patterns to Follow

- **File write pattern**: `scripts/critic-genealogy.ts:573–590` — uses `mkdirSync({ recursive: true })` + `writeFileSync`; mirror with `appendFileSync` for JSONL
- **Test structure**: `scripts/__tests__/critic-genealogy.test.ts:44–76` — `describe` blocks, `bun:test` imports, `expect().toBe()` / `expect().toThrow()`
- **Type naming**: `scripts/critic-genealogy.ts:31–68` — `interface`/`type` in CapitalCase, camelCase properties, snake_case for JSON-compat keys (e.g., `refs.baseline_sha`)
- **Export pattern**: named exports inline; no default exports

### Types & Interfaces

```typescript
// Canonical 6-value discriminated union for event field
export type EventType =
  | "promote"
  | "rollback"
  | "skip"
  | "regression"
  | "gap-detected"
  | "verdict-ready";

// Refs: string keys → file paths, SHAs, experiment IDs
export type EventRefs = Record<string, string>;

// One row in history/memory.jsonl
export interface MemoryEvent {
  ts: string; // ISO 8601 timestamp
  week: string; // e.g. "2026-W17"
  actor: string; // e.g. "planner", "apply", "visual", "verdict", "human"
  event: EventType;
  refs: EventRefs;
  insight: string; // one-sentence durable takeaway
}

// Filter criteria for reader helper
export type MemoryFilter = Partial<Pick<MemoryEvent, "week" | "actor" | "event">>;
```

### Architecture Notes

- **File location**: `scripts/memory.ts` — follows existing Bun script conventions; no `src/` directory exists
- **Tests location**: `scripts/__tests__/memory.test.ts`
- **JSONL log path**: `history/memory.jsonl` — relative to project root; helpers should resolve from `process.cwd()` or accept a configurable path
- **Idempotency key**: `(ts, week, actor, event, refs.exp_id)` — only deduplicate when `refs.exp_id` is present; if absent, always append
- **File header**: must include `// ORCHESTRATOR-ONLY: agents must not import this module directly (ADR-0001)` as the first line
- **Error propagation**: no silent fallbacks; let `fs` errors throw; no try/catch that swallows errors

---

## Implementation Summary

### Story Overview

| ID     | Title                                              | Priority | Dependencies   |
| ------ | -------------------------------------------------- | -------- | -------------- |
| US-001 | MemoryEvent type + EventType enum                  | 1        | —              |
| US-002 | appendEvent helper with idempotency                | 2        | US-001         |
| US-003 | tailN + filter reader helpers                      | 3        | US-001         |
| US-004 | Unit tests: round-trip, idempotency, tailN, filter | 4        | US-002, US-003 |

### Dependency Graph

```text
US-001 (schema/types)
    ↓
US-002 (append helper)   US-003 (reader helpers)
    ↓                         ↓
         US-004 (tests)
```

---

## Validation Requirements

Every story must pass:

- [ ] Type-check: `bun run type-check`
- [ ] Lint: `bun run lint --max-warnings 0`
- [ ] Tests: `bun test`
- [ ] Format: `bun run format:check`
- [ ] Full: `bun run validate`

---

Generated: 2026-04-23T00:00:00Z
