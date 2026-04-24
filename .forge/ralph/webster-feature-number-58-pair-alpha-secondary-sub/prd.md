# Pair Alpha Secondary Substrates — Product Requirements

## Overview

**Problem**: Webster's current demo arc proves the council loop on one primary landing page only. Without secondary substrates, judges and operators cannot see whether the planner, critic council, verdict model, and mock history conventions generalize beyond the healthcare landing page.
**Solution**: Build `scripts/seed-secondary-substrates.ts`, a deterministic Bun/TypeScript seeder that creates two synthetic single-file secondary landing pages plus mock onboard/week-1/week-2 run artifacts for each substrate.
**Branch**: `ralph/webster-feature-number-58-pair-alpha-secondary-sub`

---

## Goals & Success

### Primary Goal

Create a demo-safe Pair Alpha substrate package that proves Webster can operate on a B2B SaaS landing page and a B2C local-service landing page without touching the primary demo arc or before/after site fork.

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Secondary site files created | `site/secondary/saas-alpha/index.html` and `site/secondary/local-service-alpha/index.html` exist | `bun run seed:secondary` then file existence assertions |
| Mock run layout complete | Each substrate has `onboard`, `week-1`, and `week-2` folders with `proposal.md`, `decision.json`, `verdict.json`, `apply-log.json` | Unit test enumerates expected paths under `history/secondary-arc/<substrate>/` |
| Idempotent deterministic output | Re-running the seeder produces byte-identical files | Test snapshots file contents before and after a second run |
| Scope safety | Seeder never mutates `history/demo-arc/`, `site/before/`, or `site/after/` | Test fingerprints protected directories before/after seeding |
| Validation green | `bun run validate` and `bun test` pass | Local command output |

### Non-Goals (Out of Scope)

- Live analytics ingestion — this is a synthetic seed artifact, not runtime telemetry.
- E-commerce substrate — explicitly held out by operator decision; Pair Alpha is SaaS + local service only.
- Modifying `history/demo-arc/` — the primary demo arc is canonical and must remain untouched.
- Modifying `site/before/` or `site/after/` — those directories are the primary before/after fork and are not part of the secondary-substrate proof.
- Network calls or external API integration — deterministic mock data only.

---

## User & Context

### Target User

- **Who**: Webster implementation operator preparing the hackathon submission.
- **Role**: Needs a fast, repeatable local command that seeds extra demo evidence.
- **Current Pain**: Current mock history is convincing for one primary substrate, but does not demonstrate cross-vertical generalization.

### User Journey

1. **Trigger**: Operator needs to show that Webster can run its council loop beyond the primary healthcare landing page.
2. **Action**: Operator runs `bun run seed:secondary`.
3. **Outcome**: Two synthetic landing pages and six mock run folders appear in stable locations, ready for demo narration and automated checks.

---

## UX Requirements

### Interaction Model

CLI-only seed workflow:

```bash
bun run seed:secondary
```

The command should be silent except for a short success message. It should be safe to run repeatedly in local development and CI. The script must use pure TypeScript/Bun stdlib file operations and no network calls.

### States to Handle

| State | Description | Behavior |
|-------|-------------|----------|
| Empty | `site/secondary/` or `history/secondary-arc/` does not exist | Create directories and all expected files |
| Loading | Seeder is writing deterministic files | Synchronous file writes are acceptable; no progress UI required |
| Error | Filesystem write fails | Let the thrown error fail the command; do not silently swallow |
| Success | All secondary files are written | Print deterministic success line and exit 0 |

---

## Technical Context

### Patterns to Follow

- **Similar implementation**: `scripts/seed-demo-arc.ts:8-17` — use Bun TypeScript, `node:fs`, `node:path`, `ROOT`, and constants for output directories.
- **Type pattern**: `scripts/seed-demo-arc.ts:21-64` — define string-literal unions and interfaces for experiment kinds, verdict outcomes, decisions, verdicts, and run rows.
- **Seed lifecycle pattern**: `scripts/seed-demo-arc.ts:345-354` — initialize owned output directories deterministically. For this feature, remove/recreate only `history/secondary-arc/` and `site/secondary/`, never protected primary paths.
- **Artifact writer pattern**: `scripts/seed-demo-arc.ts:393-419` — emit pretty-printed JSON files with trailing newline and Markdown proposal files.
- **CLI entry/export pattern**: `scripts/seed-demo-arc.ts:485-510` — `main()` gated by `if (import.meta.main)` and export constants/helpers for tests.
- **Package script pattern**: `package.json:12-23` — add a new script beside existing validation/test scripts.
- **Test pattern**: `scripts/__tests__/memory.test.ts:1-85` — Bun test with `describe`, `test`, `expect`, filesystem setup/cleanup, and deterministic assertions.

### Types & Interfaces

```typescript
type SecondarySubstrate = "saas-alpha" | "local-service-alpha";
type SecondaryRun = "onboard" | "week-1" | "week-2";
type ExperimentKind = "text" | "component" | "asset" | "css";
type OutcomeLane =
  | "promote-fast-track"
  | "promote-fallback"
  | "promote-gate-win"
  | "archive-gate-fail"
  | "auto-rollback"
  | "hold";

interface SecondaryDecisionJSON {
  substrate: SecondarySubstrate;
  run: SecondaryRun;
  selected_issues: Array<{
    exp_id: string;
    kind: ExperimentKind;
    target_files: string[];
    proposed_change: string;
    expected_outcome_lane: OutcomeLane;
  }>;
  reasoning: string;
  monitor_signal: string;
}

interface SecondaryVerdictJSON {
  substrate: SecondarySubstrate;
  run: SecondaryRun;
  experiments: Array<{
    exp_id: string;
    kind: ExperimentKind;
    reward_delta_pct: number;
    p_value: number;
    classification: "improved" | "hurt" | "neutral";
    outcome: OutcomeLane;
  }>;
}

interface SecondaryApplyLogJSON {
  substrate: SecondarySubstrate;
  run: SecondaryRun;
  applied: boolean;
  touched_files: string[];
  skipped: Array<{ exp_id: string; reason: string }>;
  notes: string;
}
```

### Architecture Notes

- `context/FEATURES.md:173` defines feature #58 as Layer 11 Pair Alpha: SaaS B2B + local service B2C synthetic HTMLs plus onboard/week-1/week-2 mock runs.
- The script owns only `site/secondary/` and `history/secondary-arc/`.
- Mock run artifact filenames must match the existing demo-run convention plus the new apply log: `proposal.md`, `decision.json`, `verdict.json`, `apply-log.json`.
- Artifact JSON shape should mirror `history/demo-arc` conventions: selected issues in `decision.json`, experiment verdict rows in `verdict.json`, Markdown experiment blocks in `proposal.md`.
- Tests should import exported constants/helpers from `scripts/seed-secondary-substrates.ts` rather than shelling out where possible, then separately verify package script presence if useful.

---

## Implementation Summary

### Story Overview

| ID | Title | Priority | Dependencies |
|----|-------|----------|--------------|
| US-001 | Add deterministic secondary substrate model and HTML writers | 1 | — |
| US-002 | Write secondary mock run artifacts | 2 | US-001 |
| US-003 | Wire CLI/package script and scope guards | 3 | US-002 |
| US-004 | Add Bun tests for layout, idempotency, and protected paths | 4 | US-003 |

### Dependency Graph

```text
US-001 (substrate data + HTML writers)
    ↓
US-002 (history/secondary-arc artifact writers)
    ↓
US-003 (main + package script + protected path discipline)
    ↓
US-004 (tests)
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

*Generated: 2026-04-24T00:00:00.000Z*
