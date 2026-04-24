# Seed Demo Arc W3/W4 — Product Requirements

## Overview

**Problem**: Feature #57 is only half shipped. `scripts/seed-demo-arc.ts` already seeds W1/W2, but the demo arc still cannot show the dramatic W3 failure/rollback beat or the W4 critic-genealogy response promised in the Webster narrative.
**Solution**: Extend the existing seeder with the already-modeled W3 and W4 experiment specs, artifact writers, baseline/memory rows, and W4 genealogy artifacts. Do not rework US-001 or US-002.
**Branch**: `ralph/seed-demo-arc-w3w4-v5`

---

## Goals & Success

### Primary Goal

Complete feature #57 by adding only US-003 and US-004 so `bun scripts/seed-demo-arc.ts` creates a complete, idempotent four-week demo arc under `history/demo-arc/`.

### Success Metrics

| Metric | Target | How Measured |
| ------ | ------ | ------------ |
| Week coverage | W1, W2, W3, and W4 artifacts exist | Run seeder and inspect `history/demo-arc/demo-W*/` |
| Outcome coverage | 6 of 7 Q4 lanes represented | Inspect `verdict.json` outcomes across all weeks |
| Genealogy proof | One W4 spawned critic artifact set exists | Inspect `history/demo-arc/demo-W4/genealogy/` |
| Runtime safety | No live history mutation | Seeder writes only beneath `history/demo-arc/` |
| Quality gate | Validation green | `bun run validate` |

### Non-Goals (Out of Scope)

- Re-implementing W1/W2 scaffold or artifact writers — already landed in `fb3256e`.
- Creating real Managed Agents through the Anthropic API — this is a deterministic mock seeder.
- Touching live weekly history outside `history/demo-arc/` — demo data must remain isolated.
- Covering the 7th outcome lane — the locked hero claim is deliberately 6/7.

---

## User & Context

### Target User

- **Who**: Webster implementation operator preparing the hackathon demo.
- **Role**: Maintains deterministic run artifacts that let the council/planner story be replayed.
- **Current Pain**: The seeded output stops at W2, so the best narrative beats are absent.

### User Journey

1. **Trigger**: Operator needs a four-week mock arc for the submission demo.
2. **Action**: Operator runs `bun scripts/seed-demo-arc.ts`.
3. **Outcome**: `history/demo-arc/` contains W1-W4 proposals, decisions, verdicts, memory, baselines, and W4 genealogy artifacts.

---

## UX Requirements

### Interaction Model

CLI-only deterministic seed script. The user runs `bun scripts/seed-demo-arc.ts`; the script recreates `history/demo-arc/` from scratch and prints a completion message.

### States to Handle

| State | Description | Behavior |
| ----- | ----------- | -------- |
| Empty | `history/demo-arc/` does not exist | Create directory tree and all artifacts |
| Loading | Script is running | Synchronous file writes; no progress UI required |
| Error | Filesystem or type errors occur | Let Bun/Node error surface; no silent fallback |
| Success | Seeder completes | W1-W4 artifacts are present and deterministic |

---

## Technical Context

### Patterns to Follow

- **Existing seeder scaffold**: `scripts/seed-demo-arc.ts:12-129` — constants, demo week identifiers, and TypeScript interfaces already define the artifact model.
- **Existing W3/W4 data**: `scripts/seed-demo-arc.ts:240-338` — W3 and W4 `EXPERIMENT_SPECS` already encode experiment IDs, outcomes, gates, and insights.
- **Artifact writer pattern**: `scripts/seed-demo-arc.ts:365-435` — proposal, decision, verdict, baseline, and memory writes are pure helper functions.
- **Existing W1/W2 orchestration**: `scripts/seed-demo-arc.ts:459-479` — `writeW1`, `writeW2`, and `main` show the intended week writer shape.
- **Locked domain narrative**: `context/DOMAIN-MODEL.md:411-431` — Q9 table defines W3/W4 experiments, outcomes, and genealogy demo beat.
- **Feature tracking**: `context/FEATURES.md:172` — #57 status and remaining scope are canonical.
- **Validation rules**: `CLAUDE.md:18-31` and `package.json:scripts.validate` — type-check, lint, format, agent/findings validation, markdownlint, and tests are mandatory.

### Types & Interfaces

```typescript
type OutcomeLane =
  | "promote-fast-track"
  | "promote-fallback"
  | "promote-gate-win"
  | "archive-gate-fail"
  | "auto-rollback"
  | "hold";

interface ExperimentSpec extends ExperimentVerdict {
  week: DemoWeek;
  target_files: string[];
  proposed_change: string;
  rationale: string;
  baseline_sha: string;
  verdict_ready_insight: string;
  promote_insight: string;
}

interface NewCriticSpec {
  name: string;
  scope: string;
  description: string;
  rationale: string;
  focus_owned: string[];
  focus_not_owned: string[];
  severity_rubric: string;
}
```

### Architecture Notes

- `initDemoArcDir()` currently creates all week directories and `demo-W4/genealogy`, so US-003/US-004 should add writers rather than new directory bootstrapping.
- `buildBaselineRows()` currently marks every row as `promoted`; US-003 must preserve `archived-gate-fail` and `rolled-back` statuses for W3 lanes.
- `buildWeekMemoryRows()` currently emits `promote` for every final event; US-003 must emit event names matching each outcome where relevant, especially rollback and skip/hold semantics.
- W4 genealogy should use the existing `AgentJSON` and `NewCriticSpec` shapes and write deterministic local JSON/Markdown artifacts under `history/demo-arc/demo-W4/genealogy/`.

---

## Implementation Summary

### Story Overview

| ID | Title | Priority | Dependencies |
| -- | ----- | -------- | ------------ |
| US-003 | Add W3 gate-fail and auto-rollback seeding | 1 | -- |
| US-004 | Add W4 conservative wins and genealogy spawn | 2 | US-003 |

### Dependency Graph

```text
US-003 (W3 artifact writers + lane-correct baseline/memory rows)
    ↓
US-004 (W4 artifact writers + genealogy spawn artifacts)
```

---

## Validation Requirements

Every story must pass:

- [ ] Type-check: `bun run type-check`
- [ ] Lint: `bun run lint --max-warnings 0`
- [ ] Tests: `bun run test`
- [ ] Format: `bun run format:check`
- [ ] Full validation: `bun run validate`

---

Generated: 2026-04-24T07:47:55Z
