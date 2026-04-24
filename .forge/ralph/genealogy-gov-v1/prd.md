# Genealogy Governance Layers 2-4 — Product Requirements

## Overview

**Problem**: Webster can now spawn new critics at runtime, but without code-level governors the council can duplicate existing critic scopes, exceed a sensible growth rate, and keep idle critics in weekly runs indefinitely. That creates token-waste drift and weakens the demo claim that genealogy is controlled rather than chaotic.
**Solution**: Implement Q5.1 governance layers 2-4 in the existing genealogy registration path: embedding-based deduplication before registration, a 13-week cap with operator soft override, and archive-on-idle pruning for critics with no promoted findings across 8 weeks.
**Branch**: `ralph/genealogy-gov-v1`

---

## Goals & Success

### Primary Goal

Bound runtime critic spawning while preserving legitimate, operator-overridable genealogy growth.

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Duplicate critic rejection | New critic specs with >=60% embedding cosine similarity to an existing critic are rejected before `POST /v1/agents` | Unit tests around `scripts/critic-genealogy.ts` registration path |
| Quarterly spawn cap | More than 3 new critics in any rolling 13-week window is blocked unless an operator override flag is present | Unit tests using historical `history/*/genealogy/spec.json` fixtures |
| Idle critic retirement | Spawned critics with 0 promoted findings over 8 weeks are moved to `agents/archive/` and excluded from active critic loading | Unit tests around archive-on-idle logic and `loadExistingCritics()` behavior |
| Validation | `bun run validate` passes with zero lint warnings | Project validation command |

### Non-Goals (Out of Scope)

- Layer 1 prompt rubric edits in `prompts/second-wbs-session.md` — explicitly deferred until `feat/orch-memory-planner-v2` PR #6 merges because that branch is actively modifying the same file.
- Redesigning planner or redesigner request schemas — Feature #55 scope is governance layers 2-4 only.
- Deleting retired critics from Git history or the Managed Agents API — Layer 4 archives local specs recoverably rather than destructive deletion.
- Building live embedding infrastructure beyond this path — the dedup check is local to `scripts/critic-genealogy.ts` new-critic registration.

---

## User & Context

### Target User

- **Who**: Webster operator running weekly landing-page improvement sessions.
- **Role**: Maintains a council of Claude Managed Agents and reviews automated changes before submission or deployment.
- **Current Pain**: Runtime genealogy is powerful, but every extra critic is a recurring weekly cost. Duplicate or idle critics turn the council into an expensive echo chamber.

### User Journey

1. **Trigger**: Planner or genealogy detection identifies a possible unowned concern and `scripts/critic-genealogy.ts` prepares a new critic spec.
2. **Action**: The orchestrator-side genealogy script evaluates overlap, recent spawn count, and idle critic state before registering or invoking agents.
3. **Outcome**: Legitimate critics are registered and invoked; duplicate or over-cap critics are blocked with explicit evidence; idle spawned critics are archived before future council runs.

---

## UX Requirements

### Interaction Model

This is backend/CLI orchestration. The primary interface remains:

```bash
bun scripts/critic-genealogy.ts --branch <council-branch> [--week YYYY-MM-DD] [--lp-target URL] [--dry-run]
bun scripts/critic-genealogy.ts --fixtures <dir> [--week YYYY-MM-DD] [--lp-target URL] [--dry-run]
```

Layer 3 adds an operator soft-override flag, for example `--override-quarterly-cap`, that allows a human-approved spawn when the 13-week cap has already been reached. Layer 4 archive-on-idle should run from the same script before active critic loading/registration so archived critics are not considered active council members.

### States to Handle

| State | Description | Behavior |
|-------|-------------|----------|
| Empty | No spawned genealogy history or no archived critics yet | Dedup still compares against current `agents/*-critic.json`; cap count is 0; retire pass no-ops |
| Loading | Embedding similarity or API-backed registration is in progress | Script prints explicit progress and continues existing fail-fast error behavior |
| Error | Embedding request fails, malformed history exists, archive move fails, or cap blocks without override | Script exits non-zero for operational errors; governance blocks print actionable reason and skip registration |
| Success | New spec is below 60% overlap, under cap or operator-overridden, and idle critics are archived | Script registers/invokes as today and writes artifacts; archive pass moves idle specs to `agents/archive/` |

---

## Technical Context

### Patterns to Follow

- **Similar implementation**: `scripts/critic-genealogy.ts:155-168` — active critics are discovered from `agents/*-critic.json`; Layer 4 should exclude `agents/archive/` by keeping archived files outside this glob.
- **Similar implementation**: `scripts/critic-genealogy.ts:457-477` — `registerAgent()` is the correct choke point before `POST /v1/agents`; Layer 2 and Layer 3 checks should run before this call.
- **Similar implementation**: `scripts/critic-genealogy.ts:570-585` — `writeArtifacts()` records genealogy specs under `history/<week>/genealogy/`; Layer 3 can count recent spawns from these artifacts.
- **Component pattern**: `scripts/critic-genealogy.ts:72-105` — CLI flags are parsed with explicit mutually-exclusive validation and `CLIError`; add the soft-override flag here.
- **Error handling pattern**: `scripts/critic-genealogy.ts:141-152` and `scripts/critic-genealogy.ts:339-356` — invalid state fails loudly with clear error messages, no silent fallback.
- **Test pattern**: `scripts/__tests__/critic-genealogy.test.ts:44-75` — CLI parsing tests assert accepted and rejected flags.
- **Test pattern**: `scripts/__tests__/critic-genealogy.test.ts:78-90` — active critic loading behavior is unit-tested directly.
- **Test pattern**: `scripts/__tests__/critic-genealogy.test.ts:160-203` — generated agent JSON behavior is tested with direct helpers and schema validation.

### Types & Interfaces

```typescript
interface NewCriticSpec {
  name: string;
  scope: string;
  description: string;
  rationale: string;
  focus_owned: string[];
  focus_not_owned: string[];
  severity_rubric: string;
}

interface AgentJSON {
  name: string;
  description: string;
  model: string;
  system: string;
  tools: unknown[];
  mcp_servers?: unknown[];
  metadata?: Record<string, string>;
}

interface CriticSummary {
  name: string;
  scope: string;
  description: string;
}

interface CLIArgs {
  branch: string | null;
  fixtures: string | null;
  weekDate: string;
  lpTarget: string;
  dryRun: boolean;
  // add: overrideQuarterlyCap: boolean;
}
```

### Architecture Notes

- Feature #55 is governed by `context/FEATURES.md:170` and Q5.1 in `context/DOMAIN-MODEL.md:303-333`; use the user's updated thresholds for this PRD: 60% cosine overlap, max 3 critics per 13 weeks, and 0 promoted findings in 8 weeks.
- Existing critic specs live in `agents/*-critic.json`; active critics include the five original critics plus `visual-design-critic.json` if present.
- Spawn artifacts live under `history/<week>/genealogy/spec.json`, created by `writeArtifacts()`.
- Registration currently happens through `registerAgent()` after `spliceNewSpec()` creates an `AgentJSON`; governance should block before remote agent creation and before session creation.
- Promoted findings evidence should come from existing history artifacts where available. If implementation needs a source of truth, prefer explicit history rows over inferring from current findings text.
- Validation follows `CLAUDE.md`: zero lint warnings, full type check, format check, tests, and `bun run validate` before declaring done.

---

## Implementation Summary

### Story Overview

| ID | Title | Priority | Dependencies |
|----|-------|----------|--------------|
| US-001 | Layer 2 embedding dedup blocks overlapping critic specs | 1 | — |
| US-002 | Layer 3 13-week cap with operator soft override | 2 | US-001 |
| US-003 | Layer 4 archive idle spawned critics | 3 | US-001, US-002 |

### Dependency Graph

```text
US-001 (dedup guard before registration)
    ↓
US-002 (rolling 13-week cap + soft override)
    ↓
US-003 (archive-on-idle pruning)
```

---

## Validation Requirements

Every story must pass:

- [ ] Type-check: `bun run type-check`
- [ ] Lint: `bun run lint --max-warnings 0`
- [ ] Tests: `bun run test`
- [ ] Format: `bun run format:check`
- [ ] Full project gate: `bun run validate`

---

Generated: 2026-04-24T00:00:00.000Z
