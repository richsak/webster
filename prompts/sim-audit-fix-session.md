# Webster sim — audit, fix, dry-run E2E session (Pi/Forge)

> Paste this whole file into a fresh Pi/Forge session. The mission is to find and fix every gap that caused the sim to silently no-op, then prove the pipeline works E2E via extensive dry runs **before** any wall-clock 10-week run.
>
> **Token discipline is the whole point of this session.** Wall-clock spend on the broken pipeline so far: ~5 min, mostly idle polling. We are not doing another speculative run. Every API call after Phase 1 must be justified by a fix that earlier dry runs prove sound.

## Mission

Investigate, fix, and dry-run-verify the Webster simulation orchestrator (`prompts/sim-council.md` + `scripts/run-simulation.ts` + `scripts/run-simulation-{lp,site}.ts`) end-to-end so that a fresh Claude Code session can run `prompts/e2e-demo-run-session.md` and have it actually produce per-week site mutations, real screenshots that diverge across weeks, and meaningful Memory-Store summaries.

Hackathon submission deadline is **2026-04-26**. Do not destroy any existing artifact in `assets/memory-stores-screenshots/manual/` or in `history/lp-demo/` / `history/site-demo/`.

## Background — what we already know (do not re-discover this; verify only)

Three cascading architectural gaps were diagnosed in chat-session immediately preceding this Forge run. Evidence is preserved at `/tmp/webster-sim/STUCK-REPORT.md` and at `/tmp/session-events.json` (full week-0 LP monitor session events).

1. **`vault_ids` missing from `sim-council.md` `create_session()`** (lines ~91–109). Production at `prompts/second-wbs-session.md:102` defines `VAULT_ID="vlt_011CaLe2pEofWQptxQyV4UMd"` and passes it on session POST. The sim fork dropped this. Direct evidence: pulled session events show first event is `mcp_authentication_failed_error: "no credential is stored for this server URL"`. Agent then fell back to local `read` tool which errored on every path because the cloud sandbox has no working tree.

2. **Demo branches local-only.** `git ls-remote --heads origin 'demo-sim-lp/*'` returns nothing. `scripts/run-simulation.ts` commits but does not push. Even with vault_ids attached, GitHub MCP `get_file_contents at ref=demo-sim-lp/w00` would 404 on `richsak/webster`.

3. **Ugly-site working-tree mods never committed.** `demo-landing-page/ugly/*` and `demo-sites/northwest-reno/ugly/*` show as `M` in working tree but `run-simulation.ts` only stages `historyDir`/`outputWeekDir`. Even after gaps 1+2 are fixed, agents would read stale pre-modification content from the remote.

4. **Bonus suspected gap — no apply step.** `sim-council.md` Step 5 (redesigner) sends a base-message and polls until idle, but never reads output events back or applies HTML mutations to the site. Production's `second-wbs-session.md` is presumed to have an apply step; the fork dropped it. **Phase 1 reviewers must confirm or refute this.**

There may be additional gaps. The 3-reviewer audit in Phase 1 exists to enumerate them before any fix is committed.

## Hard rules

- Do not run any sim (`bun run sim:lp`, `bun run sim:site`, `bun scripts/run-simulation*.ts`) outside the explicit dry-run steps in Phase 4.
- Do not modify production agents (`agents/webster-{monitor,planner,redesigner,visual-reviewer}.json`, `agents/{seo,brand-voice,fh-compliance,conversion,copy}-critic.json`).
- Do not modify `prompts/second-wbs-session.md`. Read it freely; never write.
- Do not skip the Phase-2 user-plan gate. Richie reads and approves the plan before any implementation begins.
- Do not push to `main`. Work happens on a feature branch off `dev`. PR base is `dev`.
- Do not bypass any pre-commit hook (`--no-verify`, `--no-gpg-sign`).
- Do not bury failures. If a dry run produces output that looks suspicious (e.g. completes too fast, identical screenshots across weeks), stop and surface it. Speed of completion is a diagnostic signal.
- Token-burn budget for this whole Forge session: **<= $20 of API spend**. If a fix design pushes you above that on the dry runs alone, surface and ask before continuing.

## Phase 0 — Pre-flight (zero API spend)

```bash
git status --short
git rev-parse --abbrev-ref HEAD
bun run validate
bun run sim:preflight
git ls-remote --heads origin 'demo-sim-lp/*' 'demo-sim-site/*'
ls assets/memory-stores-screenshots/manual/
cat /tmp/webster-sim/STUCK-REPORT.md  # if it still exists
```

Expected: validate green, preflight green, ls-remote empty, manual PNG present. If any of these unexpectedly fail or unexpectedly pass (i.e. branches ARE on remote — that would change the diagnosis), pause and investigate before Phase 1.

Create a worktree for this work:

```bash
git worktree add ../webster-sim-fix dev -b fix/sim-orchestrator-gaps
cd ../webster-sim-fix
```

All subsequent work happens in the worktree.

## Phase 1 — 3 parallel reviewer agents (no fixes, no API calls to Anthropic from inside the reviewers)

Spawn three reviewer subagents IN PARALLEL. Each one reads code only and reports back. None of them executes the simulation. None of them calls the Anthropic API.

### Reviewer A — Production-vs-sim diff (GPT-5.5, low reasoning)

Focus: enumerate every architectural divergence between production and sim orchestrators.

Inputs to read:

- `prompts/second-wbs-session.md` (full)
- `prompts/sim-council.md` (full)
- `scripts/run-simulation.ts`
- `scripts/run-simulation-lp.ts`
- `scripts/run-simulation-site.ts`
- `scripts/critic-genealogy.ts`
- `scripts/apply-worker.ts` (if present)
- `scripts/apply-worker-cli.ts` (if present)

Output a markdown table:

| Step | Production behavior | Sim behavior | Gap | Risk         |
| ---- | ------------------- | ------------ | --- | ------------ |
| ...  | ...                 | ...          | ... | low/med/high |

Specifically confirm/refute:

- vault_ids inclusion in session POST body (already known gap; confirm fix shape)
- redesigner apply step (suspected gap; trace where production reads output events and produces a commit, and whether the same hook exists in sim)
- visual-reviewer screenshot ingestion (does prod actually receive the screenshots? how?)
- genealogy spawn invocation (where does prod call `critic-genealogy.ts` and with what inputs?)
- memory-store write timing (does prod write summaries pre/post council? sim does post — is that right?)
- monitor/critic findings persistence (prod commits findings via GitHub MCP `create_or_update_file`; does sim do the same?)

Hard limit: read-only. Do not write any file. Do not call any API.

### Reviewer B — Data lifecycle audit (GPT-5.5, low reasoning)

Focus: trace every file in the simulation's data lifecycle from ugly source → final timelapse asset.

Inputs to read:

- `scripts/run-simulation.ts`
- `scripts/run-simulation-{lp,site}.ts`
- `prompts/sim-council.md`
- `scripts/synthetic-analytics.ts` and `scripts/analytics-ingestion.ts`
- `scripts/build-demo-manifest.ts`
- `agents/webster-lp-sim-*.json` (read each system prompt — note any path or ref the agent expects)
- `demo-landing-page/ugly/`, `demo-landing-page/context/` (just `ls -R`, do not read every file)
- `demo-sites/northwest-reno/ugly/`, `demo-sites/northwest-reno/context/` (same)

For every file in the data flow, report:

- **Producer**: what writes it
- **Consumers**: what reads it (script, agent, downstream artifact)
- **Persistence**: working tree only / committed / pushed to remote
- **Per-week reset**: does it get overwritten each week? appended? immutable?
- **Risk**: missing-input scenarios, stale-content scenarios, race conditions

Specifically trace:

- `demo-landing-page/ugly/index.html` → who writes it, who commits it, who pushes it, who reads it via MCP, when does it become the input to week N council
- redesigner-proposed HTML → where does it land (event log? committed file? PR?)
- weekly screenshots → producer (Playwright via `captureScreenshots`), consumer (week-summary, build-demo-manifest, video composition session)
- `history/{lp,site}-demo/w<NN>/analytics.json` → producer (synthetic-analytics), consumer (council session via base_message reference, ingestion?)
- memory-store writes → producer (`writeMemorySummary` in run-simulation.ts), consumer (next-week planner via `attach`)

Hard limit: read-only.

### Reviewer C — Token-spend trap audit (GPT-5.5, x-high reasoning)

Focus: find every place in the pipeline where API tokens can be burned without producing useful artifacts. The previous run's 3:21 completion across 11×9 sessions is the reference failure.

Inputs to read:

- `scripts/run-simulation.ts`
- `prompts/sim-council.md`
- `scripts/synthetic-analytics.ts`
- All sim-agent JSONs under `agents/webster-{lp,site}-sim-*.json` — read system prompts in full; the system prompt's instruction set is what determines if the agent will attempt useless work when its inputs are unavailable
- `environments/webster-council-env.json`
- `scripts/critic-genealogy.ts`

Report each token-trap with:

- **Trap location**: file:line
- **Failure mode**: what makes the API call happen with no productive output
- **Detection signal**: what an honest pipeline would see/log when this trap fires (so a fix can add a fail-fast guard)
- **Cost upper bound**: per-week API spend if this trap fires for every session, every week
- **Suggested guard**: smallest viable check that would cause the pipeline to halt rather than spin

Specifically reason about:

- Session creation that proceeds even though `vault_ids` is missing → entire 9-session council burns tokens for nothing every week, every substrate. (Already known. Confirm fix-side guard: `create_session` should refuse to POST if `vault_ids` is empty AND any agent's system prompt references GitHub MCP.)
- `poll_idle` accepting an `idle` status without checking whether the session produced ANY agent output events. Right now `idle` after a `session.error` is treated as success. Suggest a minimum-events threshold or an explicit "did the agent emit at least one tool_use?" check.
- Synthetic-analytics agent calls — `requestOpusReview` in `run-simulation.ts:272`: how does this fail? Does it have its own token-trap?
- Memory-store writes via REST API: do they cost? are they per-week?
- Genealogy probe vs spawn: spawn is a `POST /v1/agents` (free) but the genealogy _decision_ may invoke an Opus session — confirm cost shape.
- `bun run validate` is invoked from inside the pre-commit hook every week; does that itself trigger any API call? (It shouldn't, but trust nothing.)

Also include a one-line **suspicious-completion heuristic** the wrapper could add: e.g. "wall-clock per-week elapsed < 60s implies no real council work; halt and surface". Even one such heuristic would have caught both of yesterday's runs in the first week.

Hard limit: read-only.

### Phase 1 deliverable

Three reviewer reports merged into a single file at `context/sim-audit/phase1-findings.md` in the worktree. Format:

```markdown
# Sim audit — Phase 1 findings (3-reviewer)

## Confirmed gaps (cross-reviewer agreement, must-fix)

- ...

## Suspected gaps (one reviewer flagged, needs verification)

- ...

## Token traps with suggested guards

- ...

## Out-of-scope notes

- ...
```

## Phase 2 — Consolidated plan (user gate)

Read `context/sim-audit/phase1-findings.md`. Author `context/sim-audit/phase2-plan.md` containing:

1. **Fix list, ordered**, each with: file path(s), one-line summary of change, justification, dry-run that proves it works.
2. **Risk assessment**: what fixes touch shared code (`scripts/run-simulation.ts`) vs sim-only (`prompts/sim-council.md`). Anything that touches shared code needs a "does production still work?" answer.
3. **Estimated API spend** for Phase 4 dry runs (with breakdown).
4. **Open questions** that Richie must answer before implementation.

Then surface to Richie:

```text
[PLAN READY] context/sim-audit/phase2-plan.md
Estimated dry-run spend: $<X>
Open questions: <Y>
Awaiting approval before Phase 3.
```

**Do not begin Phase 3 until Richie acknowledges the plan.** If a Forge runtime auto-approves, surface a `[STUCK: AWAITING USER PLAN APPROVAL]` instead.

## Phase 3 — Implementation

Apply fixes from `phase2-plan.md` in dependency order. One conventional commit per fix or one small bundled commit per group, per `AGENTS.md` git rules.

Hard requirements:

- Every commit passes `bun run validate`.
- Every fix has a unit test added or updated. No fix is "tested by the dry run" alone.
- Pushing demo branches: introduce push step in `run-simulation.ts` or a wrapper. Use the `gh` CLI authenticated to `richsak/webster` (verify this remote exists before depending on it).
- Committing the ugly-site working-tree mods: do this as a clean separate commit on `dev` BEFORE any sim run, so the demo branches are based off a HEAD that contains the ugly content. The commit message should clarify these are the demo-substrate ugly baselines, not Nicolette-production state.
- vault_ids fix in `sim-council.md`: include it in `create_session()` AND add a guard that errors loudly if `vault_ids` is empty.

Do not invent fixes outside the Phase-2 plan. If you discover a new issue mid-implementation, surface it back to Richie rather than silently expanding scope.

## Phase 4 — Extensive dry runs

Each dry run is gated on the previous one passing. Stop at the first failure; do not roll forward.

### 4.1 — Mocked sim end-to-end (zero API spend)

Use the existing `WEBSTER_SIM_COUNCIL_CMD` env var (already supported in `scripts/run-simulation-lp.ts`) to point at a stub script that:

- Echoes a fake council session ID
- Writes synthetic-shaped output files where the real council would
- Returns exit 0

Run the LP sim end-to-end with this stub. Verify:

- All 11 weeks complete
- Each week's branch contains the expected files
- Branches push successfully (use a sandbox remote like `richsak/webster-sim-dryrun` if you want to avoid polluting `richsak/webster`)
- `bun scripts/build-demo-manifest.ts` runs cleanly on the output
- Final `bun run validate` is green

Cost: $0 (no Anthropic calls).

### 4.2 — One-week LIVE dry run for one substrate (~$5–15)

Run `bun run sim:lp` configured to run **only week 0**. Verify:

- Wall-clock duration > 90s (anything under 60s is the failure signal)
- Session events for the LP monitor contain >= 5 events including >= 1 `agent.message`, >= 1 `agent.tool_use`, and >= 1 successful `mcp_tool_result`
- The redesigner session produces at least one apply-step output
- The committed `demo-sim-lp/w00` HEAD diff vs base shows redesigner-driven file changes (not just history/screenshots)
- Memory store contents grew (compare via API: total bytes or document count up vs before)

Halt and surface immediately if any check fails.

### 4.3 — Two-week LIVE dry run, BOTH substrates sequential (~$20–40)

Only run if 4.2 fully passes. Run LP weeks 0–1, then site weeks 0–1.

Verify:

- Site state diverges between week 0 and week 1 for each substrate (HTML diff non-empty)
- Memory-store summaries from week 0 actually inform week 1 (planner session for week 1 should reference week 0 findings; check session events)
- Both substrates' demo branches push to the appropriate remote
- `build-demo-manifest.ts` produces a valid manifest

If any check fails: halt, capture evidence (session IDs, branch names, event payloads), and surface a fix recommendation. Do not roll forward to a 10-week run.

### 4.4 — Decision gate

If 4.1–4.3 all pass:

- Write `context/sim-audit/phase4-greenlight.md` summarizing the dry-run evidence
- Surface `[GREENLIGHT] Phase 4 complete. E2E pipeline verified for 1–2 week runs. Ready for Richie to invoke prompts/e2e-demo-run-session.md in a fresh Claude Code session for the full 10-week run.`

If anything fails: do not auto-loop into more attempts. Surface a `[STUCK]` with the failing check, the evidence, and a one-line recommendation.

## Acceptance criteria

This Forge session is done when **all** of the following are true:

- [ ] `context/sim-audit/phase1-findings.md` exists with 3-reviewer cross-confirmed findings
- [ ] `context/sim-audit/phase2-plan.md` exists and was approved by Richie
- [ ] All Phase-3 fixes are committed on a single feature branch off `dev`
- [ ] `bun run validate` is green on the feature branch
- [ ] `context/sim-audit/phase4-greenlight.md` documents passing dry runs at 4.1, 4.2, and 4.3
- [ ] A PR is open against `dev` titled `fix: webster sim orchestrator E2E gaps` with a description that summarizes the 3 known gaps + any reviewer-discovered ones
- [ ] No commits on `main`. No edits to `prompts/second-wbs-session.md` or production agents.

## Handoff to Richie's Claude Code session

When Phase 4 greenlights:

1. Confirm PR is open and CI is green
2. Surface the PR URL and the 1–2 line "what to do next" instruction:
   `Ready: in your Claude Code session, run \`/clear\` then attach \`prompts/e2e-demo-run-session.md\`. The pipeline now does real council work; expect 30–60 min per substrate.`
3. Save final state log at `context/sim-audit/handoff.md` with: PR URL, dry-run evidence summary, list of files changed, list of files explicitly NOT changed.

## STUCK protocol

If you reach a point that this prompt does not answer or where the next safe action is unclear:

```text
[STUCK] <one-line>
Phase: <0|1|2|3|4>
Evidence: <paths or session IDs>
What I tried: ...
What I need from Richie: <one specific question>
```

Do not paper over. Visible struggle is the contract.
