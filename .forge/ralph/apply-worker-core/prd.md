# Apply-Worker Core — Product Requirements

## Overview

**Problem**: After the redesigner council produces `proposal.md` + `decision.json`, nothing
physically applies the changes to site files. The apply step must also enforce a hard validation
floor (lint + type + format) and commit each experiment as its own atomic git commit so bad
experiments can be surgically reverted without touching co-shipped winners.

**Solution**: A TypeScript CLI script (`scripts/apply-worker.ts`) that reads the redesigner's
outputs, applies text mutations to site files issue-by-issue, enforces the hard floor, and
commits each passing experiment with an `Experiment-Id:` trailer. Failures emit skip rows
instead of broken commits.

**Branch**: `feat/apply-worker-core`

---

## Goals & Success

### Primary Goal

Automate the apply step of the weekly council loop: proposal → validated site mutations →
per-experiment commits, with no silent fallbacks.

### Success Metrics

| Metric                                         | Target                                   | How Measured          |
| ---------------------------------------------- | ---------------------------------------- | --------------------- |
| `bun run validate` green                       | 100% pass                                | CI                    |
| All acceptance-criteria paths covered by tests | 3/3 (parse, commit-message, skip-emit)   | `bun test`            |
| Per-experiment commit discipline               | Each commit has `Experiment-Id:` trailer | `git log --format=%B` |
| No co-mingled experiments                      | 1 issue per commit, never batched        | git history           |

### Non-Goals (Out of Scope)

- **#39b runtime validation gate** — headless browser (Playwright) checks wiring; separate story
- **#39c critic re-run gate** — spawn critics against mutated code; separate story
- **#39d per-cluster PR emission** — open PRs per issue cluster; separate story
- **#48 multi-kind routing** — CSS/component/asset mutation kinds; Layer 10, post-submission
- **#56 skip-contract full implementation** — this story emits the documented skip-row schema
  so #56 can slot in; the schema is the interface, the consumer is out of scope here

---

## User & Context

### Target User

- **Who**: The Forge orchestrator (automated pipeline), not a human operator
- **Role**: Runs after the redesigner emits `proposal.md` + `decision.json`; feeds output to
  the visual reviewer (#41)
- **Current Pain**: Apply step is entirely manual — a human has to read the proposal and
  hand-edit site files. Mistakes in the apply step corrupt the experiment baseline.

### User Journey

1. **Trigger**: Forge dispatches `scripts/apply-worker.ts --week 2026-04-23` after the
   redesigner completes
2. **Action**: Script reads `history/2026-04-23/proposal.md` + `decision.json`, resolves the
   selected-issue list, applies text mutations file-by-file, validates after each mutation,
   commits on pass or emits skip row on fail
3. **Outcome**: `history/2026-04-23/apply-log.json` written; per-experiment commits on branch;
   `skips.jsonl` / `memory.jsonl` updated for failures

---

## UX Requirements

### Interaction Model

CLI script invoked by Forge workflow:

```bash
bun scripts/apply-worker.ts --week 2026-04-23 [--dry-run]
```

- `--week` — ISO date string matching the `history/<week>/` directory
- `--dry-run` — parse + plan mutations, print what would happen, do not write files or commit

### States to Handle

| State              | Description                                         | Behavior                                                                                                   |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Missing input      | `history/<week>/` dir or either JSON/MD file absent | Fatal error, non-zero exit, clear message                                                                  |
| No selected issues | `decision.json.selected_issues` is empty            | Write empty `apply-log.json`, exit 0                                                                       |
| Mutation applied   | Before string found in target file                  | Apply, validate, commit with `Experiment-Id:`                                                              |
| Mutation not found | Before string absent from target file               | Emit skip row (`reason: "string_mismatch"`), continue                                                      |
| Validation fail    | lint / type / format fail post-mutation             | Roll back file, emit skip row (`reason: "lint_failure"` / `"type_failure"` / `"format_failure"`), continue |
| All skipped        | Every experiment skipped                            | Write apply-log, exit 0 (not an error — #56 consumer decides)                                              |
| Dry run            | `--dry-run` flag                                    | Print mutation plan, skip writes, exit 0                                                                   |

---

## Technical Context

### Patterns to Follow

- **Script structure + CLI parsing**: `scripts/critic-genealogy.ts:1-80` — parseArgs, CLIError
  class, main() with try/catch, process.exit(1) on error
- **Test pattern**: `scripts/__tests__/critic-genealogy.test.ts:1-80` — `bun:test`, `describe`/
  `test`/`expect`, import named exports directly from the script under test
- **Exec pattern**: `scripts/critic-genealogy.ts:~540` — `Bun.spawnSync` for shell commands
  (validation gates use this)
- **JSONL append**: model on `history/<week>/memory.jsonl` existing format (append-only)

### Types & Interfaces

````typescript
// Decision file shape (history/<week>/decision.json)
interface DecisionIssue {
  owner: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  issue: string;
  evidence: string;
  proposed_change: string;
  files_touched: string[];
}

interface DecisionJSON {
  week: string;
  selected_issues: DecisionIssue[];
}

// Parsed from proposal.md (before/after blocks extracted per issue)
interface ProposalIssue {
  index: number; // 1-based position in proposal (for exp-NN numbering)
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  files_touched: string[];
  mutations: RawMutation[]; // one per before/after block found in the issue section
}

interface RawMutation {
  file: string; // from "Target file(s):" line — first file listed if ambiguous
  before: string; // content inside ```...``` "Before" block
  after: string; // content inside ```...``` "After" block
}

// Per-mutation result
interface MutationResult {
  file: string;
  status: "applied" | "string_mismatch";
  before: string;
  after: string;
}

// Per-experiment result (one issue = one experiment)
interface ApplyExperiment {
  exp_id: string; // "exp-01-hero-h1-rewrite"
  severity: string;
  title: string;
  status: "applied" | "skipped";
  mutations: MutationResult[];
  commit_sha?: string;
  skip_reason?: "string_mismatch" | "lint_failure" | "type_failure" | "format_failure";
  skip_details?: Record<string, unknown>;
}

// history/<week>/apply-log.json
interface ApplyLogJSON {
  week: string;
  run_timestamp: string; // ISO 8601
  experiments: ApplyExperiment[];
  validation_summary: {
    lint_passed: boolean;
    type_check_passed: boolean;
    format_check_passed: boolean;
  };
}

// Row appended to history/<week>/skips.jsonl and memory.jsonl on skip
interface SkipRow {
  ts: string; // ISO 8601
  week: string; // "2026-W17"
  actor: "apply-worker";
  event: "skip";
  exp_id: string;
  reason: "apply-fail" | "string_mismatch" | "lint_failure" | "type_failure" | "format_failure";
  details: Record<string, unknown>;
  concern_ref: string; // issue title
}
````

### Architecture Notes

- **Single file**: `scripts/apply-worker.ts` — mirrors `scripts/critic-genealogy.ts` shape
- **Named exports**: all core functions exported (parseArgs, parseProposal, parseDecision,
  applyMutation, runValidation, buildCommitMessage, emitSkip) so tests can import them directly
- **No side effects at module scope**: everything inside functions; `main()` called only via
  `if (import.meta.main)`
- **Validation gate** shells out via `Bun.spawnSync("bun", ["run", "lint", "--max-warnings", "0"])`,
  `Bun.spawnSync("bun", ["run", "type-check"])`,
  `Bun.spawnSync("bun", ["run", "format:check"])` — captures stdout/stderr for skip details
- **Git commit** shells out via `Bun.spawnSync("git", ["commit", "-m", message])` after
  `Bun.spawnSync("git", ["add", ...files])` — extracts SHA from stdout
- **Commit message format** (per ADR-0002 + Q8):

  ```text
  feat(apply): <exp-slug>

  Redesigner proposal issue #N: <issue-title>
  Files touched: <comma-separated list>

  Experiment-Id: exp-NN-<slug>
  ```

- **Exp slug**: kebab-case from issue title, max 40 chars, prefixed `exp-NN-` (zero-padded index)
- **Skip files**: `history/<week>/skips.jsonl` (for #56 consumer) and `history/<week>/memory.jsonl`
  (for planner). Append one JSON line per skip. Both files may not exist yet — create on first write.

### Integration Points

- **Input**: `history/<week>/proposal.md`, `history/<week>/decision.json` (both must exist)
- **Output**: `history/<week>/apply-log.json` (created/overwritten), `history/<week>/skips.jsonl`
  (appended), `history/<week>/memory.jsonl` (appended), git commits on current branch
- **Downstream (#39b)**: `apply-log.json` is the source of truth for which experiments landed
- **Downstream (#56)**: `skips.jsonl` rows follow the documented `SkipRow` schema — no changes
  to that schema should be needed when #56 lands

---

## Implementation Summary

### Story Overview

| ID     | Title                                        | Priority | Dependencies  |
| ------ | -------------------------------------------- | -------- | ------------- |
| US-001 | Types, interfaces & proposal parser          | 1        | —             |
| US-002 | Text mutation engine                         | 2        | US-001        |
| US-003 | Validation gate + commit discipline          | 3        | US-002        |
| US-004 | Skip-row emission + apply-log writer         | 4        | US-003        |
| US-005 | CLI entrypoint + orchestration               | 5        | US-001–US-004 |
| US-006 | Unit tests: parse, commit-message, skip-emit | 6        | US-005        |

### Dependency Graph

```text
US-001 (types + parser)
    ↓
US-002 (mutation engine)
    ↓
US-003 (validation + commit)
    ↓
US-004 (skip emit + apply-log)
    ↓
US-005 (CLI + orchestration)
    ↓
US-006 (unit tests)
```

---

## Validation Requirements

Every story must pass:

- [ ] Type-check: `bun run type-check`
- [ ] Lint: `bun run lint --max-warnings 0`
- [ ] Tests: `bun run test`
- [ ] Format: `bun run format:check`
- [ ] Full suite: `bun run validate`

---

Generated: 2026-04-23T00:00:00Z
