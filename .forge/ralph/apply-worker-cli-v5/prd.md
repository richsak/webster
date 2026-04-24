# Apply Worker CLI v5 — Product Requirements

## Overview

**Problem**: Webster has the apply-worker core for parsing `proposal.md`, applying text mutations, running validation, emitting skip rows, writing `apply-log.json`, and building experiment commit messages, but the weekly operator still lacks a single CLI entrypoint and integration-level proof that the full proposal-to-commit path is safe.
**Solution**: Add a thin CLI wrapper around the existing apply-worker core and integration tests that exercise successful mutation commits, correct `Experiment-Id` trailers, and validation-blocked broken proposals.
**Branch**: `ralph/apply-worker-cli-v5`

---

## Goals & Success

### Primary Goal

Expose the merged apply-worker core as a production CLI that can be run against a weekly history directory and can commit only validated experiment mutations.

### Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| CLI entrypoint exists | `scripts/apply-worker/cli.ts` or repo-convention equivalent invokes the core from a weekly directory | Code review and `bun` execution in tests |
| Valid experiment commits | Every applied experiment creates a Git commit with `Experiment-Id: exp-NN-slug` | Integration test inspects `git log --format=%B` |
| Broken output is blocked | A deliberately broken proposal does not create a commit | Integration test compares commit count and apply log/skip output |
| Quality floor | Type, lint, format, validators, markdownlint, and tests pass | `bun run validate` |

### Non-Goals (Out of Scope)

- Reimplementing US-001 through US-004 — the core parser, text mutation engine, validation gate, skip-row emission, and apply-log writer already exist in `scripts/apply-worker.ts`.
- Multi-kind proposal routing — tracked separately in Layer 10 #47-#49.
- Visual review or critic rerun gates — downstream of the apply step and not part of this remaining scope.
- Changing proposal or decision schemas — this story consumes the existing `proposal.md` and `decision.json` shapes.

---

## User & Context

### Target User

- **Who**: Webster implementation operator running the weekly landing-page improvement loop.
- **Role**: Takes a redesigner proposal and operator decision from `history/<week>/`, applies selected edits, and promotes only safe experiments.
- **Current Pain**: The core code exists but the operator cannot reliably run one command that reads weekly artifacts, applies each selected issue, validates, commits, and records blocked experiments.

### User Journey

1. **Trigger**: The weekly council produces `history/<week>/proposal.md` and `history/<week>/decision.json`.
2. **Action**: The operator runs the apply-worker CLI against that week directory.
3. **Outcome**: Each valid selected issue lands as its own commit with an experiment trailer; invalid or validation-breaking issues are skipped and recorded without a commit.

---

## UX Requirements

### Interaction Model

Command-line only. The CLI should follow existing script conventions: executable Bun TypeScript files under `scripts/`, `#!/usr/bin/env bun`, `import.meta.main` guard, explicit usage/error output, and non-zero exits for bad invocation. Existing entrypoint patterns appear in `scripts/critic-genealogy.ts:676-694`, `scripts/validate-agents.ts:129`, and `scripts/validate-findings.ts:108`.

Likely command shape:

```bash
bun scripts/apply-worker/cli.ts history/2026-04-23
```

The CLI reads:

- `<weekDir>/proposal.md`
- `<weekDir>/decision.json`

The CLI writes:

- `<weekDir>/apply-log.json`
- `<weekDir>/skips.jsonl` when an experiment is skipped
- `<weekDir>/memory.jsonl` skip rows via the existing helper
- one Git commit per validated experiment

### States to Handle

| State | Description | Behavior |
|-------|-------------|----------|
| Empty | Week directory or required files are missing | Print usage/error and exit non-zero without mutating files |
| Loading | CLI is applying one selected proposal issue | Log current experiment id/title and validation status to stdout/stderr |
| Error | Proposal parse, string mismatch, validation failure, git add, or git commit fails | Record terminal skip when applicable; fail clearly for unrecoverable setup/git errors |
| Success | All selected issues were either committed or explicitly skipped | Write `apply-log.json`; exit 0 if the run completed deterministically |

---

## Technical Context

### Patterns to Follow

- **Apply-worker core**: `scripts/apply-worker.ts:287-317` — `parseDecision` and `parseProposal` already map weekly artifacts into selected proposal issues.
- **Mutation engine**: `scripts/apply-worker.ts:319-357` — `applyMutation` performs exact string replacement and returns `string_mismatch` instead of silently proceeding.
- **Validation floor**: `scripts/apply-worker.ts:359-369` — `runValidation` runs lint, type-check, and format-check; the CLI must treat any failure as a no-commit skip for that experiment.
- **Commit trailer format**: `scripts/apply-worker.ts:372-393` — `buildCommitMessage` validates `exp-NN-slug` and emits `Experiment-Id: ${expId}`.
- **Git commit helper**: `scripts/apply-worker.ts:395-429` — `commitExperiment` stages touched files and parses the commit SHA.
- **Skip/apply-log writers**: `scripts/apply-worker.ts:442-457` — `emitSkip` and `writeApplyLog` already write terminal skip rows and `apply-log.json`.
- **Fixture schemas**: `history/2026-04-23/decision.json:1-25` shows `week` plus `selected_issues`; `history/2026-04-23/proposal.md:1-28` shows issue headings, target files, and Before/After blocks.
- **Test pattern**: `scripts/__tests__/memory.test.ts:1-18` uses `bun:test`, temp paths, and explicit cleanup; use the same style for integration fixtures.
- **CLI error pattern**: `scripts/critic-genealogy.ts:676-694` guards `import.meta.main`, maps usage errors to exit 2, and unexpected failures to exit 1.

### Types & Interfaces

```typescript
export interface DecisionJSON {
  week: string;
  selected_issues: DecisionIssue[];
}

export interface ProposalIssue {
  index: number;
  severity: Severity;
  title: string;
  files_touched: string[];
  mutations: RawMutation[];
}

export interface ApplyExperiment {
  exp_id: string;
  severity: Severity;
  title: string;
  status: "applied" | "skipped";
  mutations: MutationResult[];
  commit_sha?: string;
  skip_reason?: "string_mismatch" | "lint_failure" | "type_failure" | "format_failure";
  skip_details?: Record<string, unknown>;
}

export interface ApplyLogJSON {
  week: string;
  run_timestamp: string;
  experiments: ApplyExperiment[];
  validation_summary: {
    lint_passed: boolean;
    type_check_passed: boolean;
    format_check_passed: boolean;
  };
}
```

### Architecture Notes

- Build strictly on top of `scripts/apply-worker.ts`; do not duplicate parser, mutation, validation, skip, log, or commit helpers.
- If the current file must be split to support `scripts/apply-worker/cli.ts`, preserve public exports and avoid changing landed US-001-US-004 behavior except where CLI orchestration needs a missing exported helper.
- Each selected issue should be treated as a separate experiment with deterministic id `exp-${NN}-${slug}` through the existing `buildCommitMessage` guard.
- The hard floor is lint + type-check + format-check before commit. Full repository validation (`bun run validate`) remains the story completion gate.
- Integration tests may need to run in a temporary Git repository or carefully isolated fixture repo so real Webster history is not mutated.

---

## Implementation Summary

### Story Overview

| ID | Title | Priority | Dependencies |
|----|-------|----------|--------------|
| US-001 | Add apply-worker CLI wrapper | 1 | — |
| US-002 | Add apply-worker integration tests | 2 | US-001 |

### Dependency Graph

```text
US-001 (CLI wrapper around existing core)
    ↓
US-002 (integration tests for commits, mutation, and validation blocking)
```

---

## Validation Requirements

Every story must pass:

- [ ] Type-check: `bun run type-check`
- [ ] Lint: `bun run lint --max-warnings 0`
- [ ] Tests: `bun run test`
- [ ] Format: `bun run format:check`
- [ ] Full gate before final commit: `bun run validate`

---

Generated: 2026-04-24T07:47:46Z
