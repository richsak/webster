# Features

> Canonical task list. Operators mark status transitions here as they work.

## Status legend

- `todo` — not started
- `in-progress` — claimed by an operator
- `done` — shipped, validated, merged
- `blocked` — waiting on external or upstream
- `cut` — pre-committed cut per `webster-open-loops` rules

## Current submission state (2026-04-23)

- **Done**: 27 (incl. #5 live run artifacts, #38 site/ fork shipped session 4, #50 planner agent spec, and #51 memory substrate shipped)
- **In-progress**: 0
- **Blocked**: 5 (demo video — Richie voice)
- **Cut**: 7 (out of submission scope; rationale inline)
- **Todo**: 29 (1 submission form + 9 Layer 8 + 9 Layer 9 + 3 Layer 10 + 7 Layer 11; all pre-submission per session-4 Phase 7 scope update + Q1–Q9 locks)

Hero feature (Critic Genealogy) shipped with live Opus 4.7 validation. All 7 Managed Agents registered. Council fan-out + redesigner + PR automation scripted in `prompts/second-wbs-session.md`. CI green, 29 tests pass. Two scope reassignments below (critic-flow skill renamed; orchestrator moved from TS to bash-in-markdown prompt) — both ship equivalent functionality.

## Stream allocation

See `AGENTS.md` for stream → operator mapping.

---

## Layer 1: Routine + Orchestrator (Stream 1 — Claude Code Opus 4.7)

| #   | Status | Feature                                                                                                                                                         | Hours |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | cut    | `routines/weekly-lp-improve.yaml` — Claude Code Routine with weekly cron. Submission uses manual `wbs @prompts/...`                                             | 2     |
| 2   | done   | Orchestrator — shipped as `prompts/second-wbs-session.md` (bash-in-markdown, not `.ts`). Functionally equivalent                                                | 4     |
| 3   | done   | Shared critic skill — shipped as `skills/webster-lp-audit/SKILL.md` (renamed from `critic-flow`)                                                                | 2     |
| 4   | done   | Per-critic context pattern: `context/critics/{name}/findings.md` (5 critics + monitor seeded)                                                                   | 1     |
| 5   | done   | Run-artifact pattern: `history/YYYY-MM-DD/` — live `history/2026-04-23/` artifacts include analytics, proposal, decision, operator decision, and genealogy logs | 2     |
| 6   | done   | Branch + PR automation via `gh pr create` — wired in Step 6 of `second-wbs-session.md`                                                                          | 2     |

## Layer 2: Managed Agent Critics (Stream 2 — Codex heartbeat)

| #   | Status | Feature                                                                                                              | Hours |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------- | ----- |
| 7   | done   | `agents/webster-monitor.json` (Haiku 4.5) — analytics anomaly detection                                              | 1     |
| 8   | done   | 5 specialist critic specs: seo, brand-voice, fh-compliance, conversion, copy (all Sonnet 4.6) — all schema-valid     | 4     |
| 9   | done   | `agents/webster-redesigner.json` (Opus 4.7) — synthesis + proposal generation                                        | 1     |
| 10  | done   | GitHub MCP integration — URL-based, vault-bound (`vault_ids`), no tokens in `user.message`                           | 3     |
| 11  | done   | Environment config — `environments/webster-council-env.json` + `.id` registered                                      | 2     |
| 12  | done   | Parallel fan-out via orchestrator → 6 parallel `/v1/sessions` calls (not `callable_agents`; that's research-preview) | 2     |

## Layer 3: Critic Genealogy (Stream 1 — Claude Code Opus 4.7)

| #   | Status | Feature                                                                              | Hours |
| --- | ------ | ------------------------------------------------------------------------------------ | ----- |
| 13  | done   | Gap detection via two-tool pattern (`report_no_gap` / `report_gap`) — `dcf5726`      | 3     |
| 14  | done   | Spec author — Opus 4.7 drafts scope + focus bullets + severity rubric via `tool_use` | 2     |
| 15  | done   | Runtime registration — `POST /v1/agents` with idempotent `findAgentByName`           | 1     |
| 16  | done   | Immediate invocation — `POST /v1/sessions` with new agent ID + vault                 | 1     |
| 17  | done   | Genealogy trail — spec logged to stderr; spawned critic commits findings to branch   | 1     |

## Layer 4: Onboarding Skill (Stream 3 — Codex heartbeat)

| #   | Status | Feature                                                                                               | Hours |
| --- | ------ | ----------------------------------------------------------------------------------------------------- | ----- |
| 18  | done   | `skills/webster-onboarding/SKILL.md` — universal skill entry (renamed from `onboard-smb`)             | 2     |
| 19  | done   | Business context Q&A flow → writes `context/business.md`                                              | 2     |
| 20  | cut    | Claude Design `.zip` translation to Astro — out of submission scope                                   | 3     |
| 21  | cut    | DNS branch (Cloudflare wrangler / `.workers.dev`) — out of submission scope                           | 2     |
| 22  | cut    | GitHub App install link + Workers Builds API — out of submission scope                                | 2     |
| 23  | done   | Credential flow — macOS keychain (`anthropic-webster` service); `security add-generic-password` shown | 2     |
| 24  | done   | First council run trigger — `wbs @prompts/second-wbs-session.md`                                      | 1     |

## Layer 5: Substrate + Mock History (Stream 5 — Claude Code)

| #   | Status | Feature                                                                                                                                                    | Hours |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 25  | cut    | Fork `certified.richerhealth.ca` Astro source → `site/` — honest scope note in README. Redesigner emits `proposal.md` brief                                | 2     |
| 26  | cut    | Analytics pixel → Cloudflare Worker → KV — not needed; mock seeder + monitor feed the council                                                              | 3     |
| 27  | done   | 10-week mock history seeder — inlined in `prompts/second-wbs-session.md` Step 1 (idempotent, ~2 min)                                                       | 4     |
| 28  | cut    | Silent secondary substrates (original cut) — **superseded by L11 #58**: Pair Alpha (SaaS + local service) brought in-submission per Q7 (session-4 Phase 7) | 2     |

## Layer 6: Meta Video (Stream 4 — Claude Code or Forge)

| #   | Status  | Feature                                                                                | Hours |
| --- | ------- | -------------------------------------------------------------------------------------- | ----- |
| 29  | blocked | Remotion setup + composition template — pending Richie voice record window             | 3     |
| 30  | blocked | 5 animated comps: title, council viz, TAM + 10-week morph, genealogy diagram, end-card | 6     |
| 31  | blocked | Opus-authored narration script `video/script.md`                                       | 1     |
| 32  | blocked | Voice record (Richie) — blocker for the whole video layer                              | 2     |
| 33  | blocked | Final assembly in Descript or CapCut (3-min clean cut)                                 | 3     |

## Layer 7: Polish (Sat-Sun)

| #   | Status | Feature                                                                           | Hours |
| --- | ------ | --------------------------------------------------------------------------------- | ----- |
| 34  | done   | README — submission narrative shipped `0ed6e98` + advisor fixes `d8e76a4`         | 2     |
| 35  | done   | CI green on main — type + lint + format + schema + findings + markdown + 29 tests | 1     |
| 36  | done   | MIT LICENSE — shipped in `0ed6e98`                                                | 1     |
| 37  | todo   | Cerebral Valley submission form — Richie action at submission time                | 1     |

## Layer 8: Apply worker + image generation (pre-submission per session-4 Phase 7)

The "missing last 20%" of Webster's full loop — turning the council's `proposal.md` brief into a reviewed code diff on the live LP. Originally scoped post-submission; moved to pre-submission in session 4 Phase 7 when autoresearch became a council input (see Layer 11 + ADR-0001 + ADR-0002).

Feature #38 shipped session 4 Phase 1; #39 / #40 decomposed by session 4 Phase 2 grill-me (see `context/v2-design.md`); Q8 per-experiment commit discipline added session 4 Phase 7 (see ADR-0002).

| #   | Status      | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Hours |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 38  | done        | Fork `certified.richerhealth.ca` → `site/` — shipped session 4 (commit `61cfae4`). `site/before/` is wget mirror of live LP; `site/after/` is `before` + week 2026-04-23 proposal applied by hand. Unblocks apply-worker development + before/after demo.                                                                                                                                                                                                                                                                                                                                 | 2     |
| 39a | done        | **Apply worker core** — Pi worker (Codex gpt-5.4) via Forge workflow with worktree isolation. Reads `history/<week>/proposal.md` + `decision.json`, mutates files per selected issues, runs lint+type+format as hard floor. **Per-experiment commit discipline (Q8, ADR-0002):** one commit per experiment with `Experiment-Id: exp-NN-<slug>` trailer; never co-mingles experiments. Shipped across core branch US-001…US-004 plus CLI v5 US-005/US-006: Bun CLI wrapper and isolated integration tests for mutation, commit trailers, apply-log metadata, and validation-blocked skips. | 4-6   |
| 39b | in-progress | **Runtime validation gate** — headless browser (Playwright) opens the mutated page; verifies CTAs resolve to real booking URLs, no `<script>` errors, no broken JS (Q2). Directly motivated by the week-1 critic blind-spot on `data-calendly-base`.                                                                                                                                                                                                                                                                                                                                      | 2-3   |
| 39c | todo        | **Critic re-run gate** — spawn the 5 critics (or 6 with visual-design) against the mutated code; require 0 new CRITICAL findings and ≤2 new HIGH findings (Q2 done-definition). Auto-loop fixes up to 3 iterations before skip+annotate.                                                                                                                                                                                                                                                                                                                                                  | 2     |
| 39d | todo        | **Per-cluster PR emission** — issue-cluster heuristic (union-find on touched files, 1–3 issues per PR, ≤3 PRs/week) per Q4. Severity-tiered skip+annotate fallback (Q5); `[partial]` label when any issue skipped; draft PR when a CRITICAL is skipped.                                                                                                                                                                                                                                                                                                                                   | 3     |
| 39e | todo        | **CF Pages preview URL wiring** — confirmed live today (`certified.richerhealth.ca` is on CF Pages via header evidence). Write preview URL into `apply-log.json`; build-time analytics scrub (`data-preview="1"`); verify preview URLs get `noindex`.                                                                                                                                                                                                                                                                                                                                     | 1-2   |
| 40a | todo        | **Tool schema + enumerated type list** — `generate_visual_asset(type, brand_context, dims, prompt)` with `type ∈ {og_card, hero_background, testimonial_headshot, icon, section_illustration}` (5-type enum from Q3). Emits stub-comment if unknown type.                                                                                                                                                                                                                                                                                                                                 | 1     |
| 40b | todo        | **Backend wire-up** — OpenAI `gpt-image-1` client (default per Q3; `[R-confirm]`) + retry + cost ceiling of $2/run. Structured error handling for rate limits + NSFW filters. Falls back to stub-comment on hard failure.                                                                                                                                                                                                                                                                                                                                                                 | 3     |
| 40c | todo        | **Brand-context input + persistence** — JSON brand-context blob from `context/business.md` + palette file (Q3). Assets to `site/public/assets/generated/<week>/<type>-<slug>.<ext>`; gitignored dedup cache at `.webster/generated-cache/`.                                                                                                                                                                                                                                                                                                                                               | 2     |
| 40d | todo        | **#39 integration pattern** — apply worker's stub-when-absent / invoke-when-present flow (Q3 soft dependency). Apply emits `<!-- asset TBD: <type> -->` comments when #40 is unavailable, swaps them for real asset URLs after #40 ships.                                                                                                                                                                                                                                                                                                                                                 | 1     |

## Layer 9: Autoresearch loop + post-apply visual review (pre-submission per session-4 Phase 7)

Added session 4 Phase 5 after visual evidence that the static critic re-run in #39c cannot catch rendered-layout regressions. Session 4 manual apply ruined hero spacing at all three breakpoints (1440 / 768 / 375). Phase 7 reshaped the verdict model around **reward + validation gates** (Q4, ADR-0002) and **per-experiment baselines** (Q8, ADR-0002), replacing the prior single-p-value threshold + full-page baseline model. Layer 9 now provides two agents: **visual-reviewer** (rendered-layout verification immediately post-apply) and the **verdict engine** (experiment outcome vs per-experiment baseline, 7 decision lanes).

Key design calls (locked session 4 Phase 7, see ADR-0002):

- **Reward**: unified page-level CTA CTR (maximized number).
- **Gates (independent vetoes)**: brand-voice alignment, bounce ceiling, scroll floor, time-on-page floor, token efficiency, heatmap sanity.
- **7 outcome lanes**: fast-track promote (p<0.01) / fallback promote / gate-win / archive-gate-fail / auto-rollback (p<0.01 negative) / hold / hold-weak-negative.
- **Per-experiment baselines**: each experiment = its own commit + `Experiment-Id:` trailer; rollback = `git revert <experiment-sha>`. Parallel independent-variable experiments ship concurrently with a cross-experiment page-CTR gate to prevent confusion creep.
- **Proxies (scroll depth, CTA visibility, time-on-page) as fast weekly signal**; CVR as slow quarterly confirmation.
- **Visual-reviewer + #39d per-cluster PRs**: smaller PRs tighten attribution for verdicts.

| #   | Status | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Hours |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 41a | todo   | **Visual-reviewer agent spec** — `agents/webster-visual-reviewer.json` (Opus 4.7 tier). Inputs: preview URL, `history/<week>/proposal.md`, BEFORE URL. Outputs: `history/<week>/visual-review.md` with findings + embedded screenshot refs.                                                                                                                                                                                                                                                   | 1     |
| 41b | todo   | **Browser-audit skill** — `skills/webster-browser-audit/SKILL.md` wraps Playwright-headless. Capabilities: 3-breakpoint screenshot (375/768/1440), accessibility-tree text extraction, interaction recording (click CTAs, scroll, form focus, console log capture).                                                                                                                                                                                                                           | 3     |
| 41c | todo   | **Proposal-intent verifier** — reads each issue in `proposal.md`, verifies visible presence in rendered output via accessibility-tree extraction (not source grep). Catches content drops like session-4 "No more patient churn" regression. Flags layout overflow via per-breakpoint height-delta vs BEFORE.                                                                                                                                                                                 | 2     |
| 41d | todo   | **#39 integration pattern** — visual-reviewer runs AFTER #39c critic re-run gate, BEFORE #39d PR emission. Fix-hint loop back to #39a apply worker, max 3 iterations; then skip+annotate per #39d severity-tiered fallback. Blocking on CRITICAL visual regressions.                                                                                                                                                                                                                          | 1     |
| 42  | todo   | **Analytics ingestion** — CF Worker pixel → D1 (or PostHog/GA4 webhook). Normalizes events to `{version_sha, metric, value, timestamp}`. Metric tiers: proxies (fast) vs CVR (slow confirmation).                                                                                                                                                                                                                                                                                             | 3     |
| 43  | todo   | **Per-experiment baselines schema** — `history/baselines.jsonl` append-only, one row per experiment: `{exp_id, week, version_sha, experiment_sha, proposal_ref, decision_ref, baseline_window, status}` with `status ∈ {promoted, archived-gate-fail, rolled-back, skipped-<reason>, holding}`. Replaces week-level baselines per Q8 (ADR-0002).                                                                                                                                              | 2     |
| 44  | todo   | **Verdict engine (reward+gates 7-outcome matrix)** — weekly cron: pulls last 7d analytics window, compares to per-experiment baselines. Emits per-experiment `{verdict, confidence, reward_delta, gate_status[], lane}` where `lane ∈ {fast-track-promote, fallback-promote, gate-win, archive-gate-fail, auto-rollback, hold, hold-weak-negative}`. **Cross-experiment page-CTR gate**: page-level reward must not regress p<0.05 across all shipped experiments in the week (Q4, ADR-0002). | 4     |
| 45  | todo   | **Per-experiment auto-rollback worker** — on `auto-rollback` lane (p<0.01 negative): `git revert <experiment-sha>` (the specific experiment commit, not the merge commit), CF Pages preview auto-deploys from revert PR, commit `history/<week>/rollback-<exp_id>.md` with evidence. Opens as draft PR so Richie can override before it hits main. **Does not touch co-shipped winners** (Q8, ADR-0002).                                                                                      | 2     |
| 46  | todo   | **Baseline promoter** — on sustained `improved` (default N=2 weeks): update baseline pointer to current sha, archive superseded baseline, log promotion event. Each promotion tightens the next week's bar.                                                                                                                                                                                                                                                                                   | 1     |

## Layer 10: Designer scope expansion (v2.5 — pre-submission)

Added session 4 Phase 7 after Richie's diagnosis that session-4 hero regression was a **designer-scope failure**, not an apply-worker failure. The redesigner had no mechanism to propose "longer copy + reduced hero font-size together" — the proposal schema is text-only by construction. L10 makes the council a design council, not a copy-editor council.

See `context/DOMAIN-MODEL.md` for the full entity + data-flow model.

| #   | Status | Feature                                                                                                                                                                                                                                                                                                                                                                            | Hours |
| --- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 47  | todo   | **Proposal schema v2 (kind-aware + constraints)** — each issue declares `kind: text\|css\|component\|asset` plus a `constraints: { preserves[], within{} }` block. Redesigner emits multi-kind atomic issues. Enables "copy change + font-size reduction, preserving 3-line desktop hero" as ONE unit.                                                                             | 2     |
| 48  | todo   | **Apply worker multi-kind routing** — apply gains a tool per kind. Text → find-replace (current #39a). CSS → token mutation (tailwind config, CSS custom properties, utility class edits). Component → structural edit (Astro component props, layout breakpoints, conditional rendering). Asset → invokes #40. Validates output against the issue's constraints before advancing. | 3     |
| 49  | todo   | **Visual-reviewer constraint verifier** — extends #41c. Reads proposal's constraint block, asserts it in rendered output. Example: "hero H1 must be exactly 3 visible lines at 1440×900" → measures element height + line-count → blocks PR if violated. Catches proposer/apply mismatches that content-presence checks miss.                                                      | 2     |

## Layer 11: Planner + experiment-aware council (v4 — pre-submission)

Added session 4 Phase 7. Autoresearch is **input to the next council run**, not a post-merge back-end loop. New `webster-planner` agent (Opus 4.7 Managed Agent) sits before critics + redesigner, reads last week's verdict + memory substrate, decides experiment direction this week, emits `plan.md` that becomes council context.

Session 4 Phase 7 locked 9 architectural questions (Q1–Q9) — all resolved in `context/DOMAIN-MODEL.md`. Key locks: Q1 Managed Agent + orchestrator-owned memory (ADR-0001), Q2 explore-broadly cold-start + unified `history/memory.jsonl`, Q3 autonomous p<0.01 rollback, Q4 reward+gates 7-outcome matrix (ADR-0002), Q5 planner-requests-new-critic via L3 genealogy (additive-only), Q5.1 four-layer genealogy governance, Q6 skip-is-terminal + structured skip rows, Q7 Pair Alpha (SaaS + local service) substrate pair, Q8 per-experiment baselines + commit trailers (ADR-0002), Q9 4-week demo arc.

| #   | Status | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Hours |
| --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 50  | done   | **`agents/webster-planner.json`** (Opus 4.7 Managed Agent, Q1 ADR-0001) — registered via `POST /v1/agents`, invoked per-run via `/v1/sessions` + events + poll (pattern verified in `scripts/critic-genealogy.ts:440-556`). Reads marshaled memory context, outputs `plan.md` with `{classification, next_action, direction_hint, new_critic_request?, rationale}`. `next_action ∈ {promote_and_experiment, hold_baseline, revert_and_retry, explore_broadly}`. _Landed on `forge/task-feat-planner-agent-spec-v5` — PR #3 merged (2026-04-24)._         | 2     |
| 51  | done   | **Memory substrate schema + append helper** (Q2) — `history/memory.jsonl` event log: `{ts, week, actor, event, refs{}, insight}` where `event ∈ {promote, rollback, skip, regression, gap-detected, verdict-ready}`. Append-only. Helper in orchestrator never touched by agents — orchestrator owns all I/O (ADR-0001). _Landed on `forge/task-feat-memory-substrate` — all 4 stories (MemoryEvent types, appendEvent, tailN+filter, unit tests)._                                                                                                      | 2     |
| 52  | done   | **Orchestrator memory marshaling + planner invocation** (Q1, Q2) — new step in `prompts/second-wbs-session.md`: before critics, orchestrator reads `memory.jsonl` tail (last N events) + last 2 weeks' `verdict.json` + `monitor` anomaly report, concatenates to planner's user-message text (step 3 of the 5-step Managed Agent flow), polls until idle, extracts output, writes `history/<week>/plan.md`, appends one `verdict-ready` event row to `memory.jsonl`. _Landed on `forge/task-feat-orch-memory-planner-v2` — PR #6 merged (2026-04-24)._  | 3     |
| 53  | done   | **Plan → council integration (additive-only)** (Q5) — critics + monitor + redesigner now receive `plan.md` body in initial `user.message` context with explicit additive-only/sovereignty language. Planner `new_critic_request` is extracted to `tmp/planner-new-critic-request-<week>.json` and passed into `scripts/critic-genealogy.ts --planner-request` as additive evidence, without bypassing dedup/cap/evidence gates.                                                                                                                          | 3     |
| 54  | todo   | **Cold-start explore-broadly mode** (Q2) — week 1 has no prior verdict. Planner runs with direction_hint="broad exploration, baseline-only analytics"; reads monitor's initial anomaly snapshot + site/ current state. Memory substrate tail is empty; planner writes an origin event row.                                                                                                                                                                                                                                                               | 2     |
| 55  | done   | **Genealogy governance layers 2–4** (Q5.1) — layer 1 is prompt-only (rubric in planner + redesigner instructions: "request only if existing critics cannot cover the concern"). Layer 2: orchestrator-side dedup — reject new-critic spec if ≥60% scope overlap with existing critic (embedding cosine). Layer 3: quarterly cap — max 3 new critics / 13 weeks, soft-override by operator. Layer 4: retire-on-idle — critic with 0 findings-promoted in 8 weeks is archived. _Landed on `forge/task-feat-genealogy-gov-v1` — PR #8 merged (2026-04-24)._ | 3     |
| 56  | todo   | **Skip-contract plumbing** (Q6) — apply-worker (#39a), critic-rerun-gate (#39c), visual-reviewer (#41) all emit structured skip rows to `history/<week>/skips.jsonl` AND append to `memory.jsonl`: `{ts, week, actor, event: "skip", exp_id, reason, details{}, concern_ref}` with `reason ∈ {apply-fail, critic-veto, visual-veto}`. Skip is terminal at current week — no mechanical roll-forward. Skips feed next-week planner as structured data.                                                                                                    | 2     |
| 57  | done   | **`scripts/seed-demo-arc.ts`** (Q9) — 4-week primary-substrate mock: 9 experiments + 1 genealogy spawn in W4. Hits 6/7 Q4 outcome lanes (fast-track, fallback, gate-win, archive-gate-fail, auto-rollback, hold). Idempotent; writes to `history/demo-arc/` without touching live history. _Landed on `forge/task-feat-seed-demo-arc-w3w4-v5` — all 4 stories (W1/W2/W3/W4 + genealogy) done, PR #5 merged (2026-04-24)._                                                                                                                                | 3     |
| 58  | done   | **`scripts/seed-secondary-substrates.ts`** (Q7) — Pair Alpha mock: SaaS (B2B) + local service (B2C) synthetic single-file HTMLs + 2-cycle mock runs each (onboard + 2 weeks of experiments). Proves generalization beyond the primary substrate. Demo-safe (no e-commerce — private hold-out per operator decision). _Landed on `forge/task-feat-seed-pair-alpha-v1` — PR #7 merged (2026-04-24)._                                                                                                                                                       | 3     |

## Totals (historical — initial plan)

| Layer                    | # Features | Hours  |
| ------------------------ | ---------- | ------ |
| Routine + Orchestrator   | 6          | 13     |
| Managed Agent Critics    | 6          | 13     |
| Critic Genealogy         | 5          | 8      |
| Onboarding Skill         | 7          | 14     |
| Substrate + Mock History | 4          | 11     |
| Meta video               | 5          | 15     |
| Polish                   | 4          | 5      |
| **TOTAL**                | **37**     | **79** |

## Cut rationale (for judges / auditors)

Four families cut, all with the same rationale: **the council composition does not depend on them**. The hero claim is the 7-agent fan-out + runtime critic genealogy, not the distribution surface.

- **`routines/` cron wiring (#1)**: weekly trigger is operator-manual for this submission. Cron is a wrapper, not the system.
- **Site fork + analytics Worker (#25, #26)**: the redesigner emits `proposal.md` instead of `proposal.diff`. Mock analytics seeder feeds the monitor — same inputs, no live pixel needed.
- **Onboarding infra (#20, #21, #22)**: Claude Design zip translation, DNS branching, GitHub App install are all onboarding polish that only matters to a second operator. The onboarding skill itself ships (#18, #19, #23).
- **Secondary substrates (#28)**: generalization proof without narration. Out of scope for a 3-day build.
