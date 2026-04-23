# Features

> Canonical task list. Operators mark status transitions here as they work.

## Status legend

- `todo` — not started
- `in-progress` — claimed by an operator
- `done` — shipped, validated, merged
- `blocked` — waiting on external or upstream
- `cut` — pre-committed cut per `webster-open-loops` rules

## Current submission state (2026-04-23)

- **Done**: 26 (incl. #38 site/ fork shipped session 4)
- **In-progress**: 1 (live run artifacts in `history/` — session 3 produced real artifacts; row update pending separate reconciliation)
- **Blocked**: 5 (demo video — Richie voice)
- **Cut**: 7 (out of submission scope; rationale inline)
- **Todo**: 10 (1 submission form + 5 #39 sub-features + 4 #40 sub-features; Layer 8 is post-submission v2 roadmap)

Hero feature (Critic Genealogy) shipped with live Opus 4.7 validation. All 7 Managed Agents registered. Council fan-out + redesigner + PR automation scripted in `prompts/second-wbs-session.md`. CI green, 29 tests pass. Two scope reassignments below (critic-flow skill renamed; orchestrator moved from TS to bash-in-markdown prompt) — both ship equivalent functionality.

## Stream allocation

See `AGENTS.md` for stream → operator mapping.

---

## Layer 1: Routine + Orchestrator (Stream 1 — Claude Code Opus 4.7)

| #   | Status      | Feature                                                                                                             | Hours |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | cut         | `routines/weekly-lp-improve.yaml` — Claude Code Routine with weekly cron. Submission uses manual `wbs @prompts/...` | 2     |
| 2   | done        | Orchestrator — shipped as `prompts/second-wbs-session.md` (bash-in-markdown, not `.ts`). Functionally equivalent    | 4     |
| 3   | done        | Shared critic skill — shipped as `skills/webster-lp-audit/SKILL.md` (renamed from `critic-flow`)                    | 2     |
| 4   | done        | Per-critic context pattern: `context/critics/{name}/findings.md` (5 critics + monitor seeded)                       | 1     |
| 5   | in-progress | Run-artifact pattern: `history/YYYY-MM-DD/` — schema defined in prompt; no live-run artifacts yet                   | 2     |
| 6   | done        | Branch + PR automation via `gh pr create` — wired in Step 6 of `second-wbs-session.md`                              | 2     |

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

| #   | Status | Feature                                                                                                                     | Hours |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------- | ----- |
| 25  | cut    | Fork `certified.richerhealth.ca` Astro source → `site/` — honest scope note in README. Redesigner emits `proposal.md` brief | 2     |
| 26  | cut    | Analytics pixel → Cloudflare Worker → KV — not needed; mock seeder + monitor feed the council                               | 3     |
| 27  | done   | 10-week mock history seeder — inlined in `prompts/second-wbs-session.md` Step 1 (idempotent, ~2 min)                        | 4     |
| 28  | cut    | Silent secondary substrates — first to cut per original cut-order                                                           | 2     |

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

## Layer 8: Post-submission v2 roadmap (NOT in April 26 submission scope)

Surfaced during the week 2026-04-23 operator review (session 3). This is the "missing last 20%" of Webster's full loop — turning the council's `proposal.md` brief into an actual reviewed code diff on the live LP. Intentionally deferred until after the hackathon submission. Layer exists so the roadmap is visible to future operators and judges reading the repo post-submission.

#38 done session 4 Phase 1; #39 and #40 decomposed by session 4 Phase 2 grill-me (see `context/v2-design.md` for full rationale on each sub-feature decision).

| #   | Status | Feature                                                                                                                                                                                                                                                   | Hours |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 38  | done   | Fork `certified.richerhealth.ca` → `site/` — shipped session 4 (commit `61cfae4`). `site/before/` is wget mirror of live LP; `site/after/` is `before` + week 2026-04-23 proposal applied by hand. Unblocks apply-worker development + before/after demo. | 2     |
| 39a | todo   | **Apply worker core** — Pi worker (Codex gpt-5.4) invoked via a Forge workflow with worktree isolation (Q1). Reads `history/<week>/proposal.md` + `decision.json`, mutates target files per the selected issues, runs lint+type+format as hard floor.     | 4-6   |
| 39b | todo   | **Runtime validation gate** — headless browser (Playwright) opens the mutated page; verifies CTAs resolve to real booking URLs, no `<script>` errors, no broken JS (Q2). Directly motivated by the week-1 critic blind-spot on `data-calendly-base`.      | 2-3   |
| 39c | todo   | **Critic re-run gate** — spawn the 5 critics (or 6 with visual-design) against the mutated code; require 0 new CRITICAL findings and ≤2 new HIGH findings (Q2 done-definition). Auto-loop fixes up to 3 iterations before skip+annotate.                  | 2     |
| 39d | todo   | **Per-cluster PR emission** — issue-cluster heuristic (union-find on touched files, 1–3 issues per PR, ≤3 PRs/week) per Q4. Severity-tiered skip+annotate fallback (Q5); `[partial]` label when any issue skipped; draft PR when a CRITICAL is skipped.   | 3     |
| 39e | todo   | **CF Pages preview URL wiring** — confirmed live today (`certified.richerhealth.ca` is on CF Pages via header evidence). Write preview URL into `apply-log.json`; build-time analytics scrub (`data-preview="1"`); verify preview URLs get `noindex`.     | 1-2   |
| 40a | todo   | **Tool schema + enumerated type list** — `generate_visual_asset(type, brand_context, dims, prompt)` with `type ∈ {og_card, hero_background, testimonial_headshot, icon, section_illustration}` (5-type enum from Q3). Emits stub-comment if unknown type. | 1     |
| 40b | todo   | **Backend wire-up** — OpenAI `gpt-image-1` client (default per Q3; `[R-confirm]`) + retry + cost ceiling of $2/run. Structured error handling for rate limits + NSFW filters. Falls back to stub-comment on hard failure.                                 | 3     |
| 40c | todo   | **Brand-context input + persistence** — JSON brand-context blob from `context/business.md` + palette file (Q3). Assets to `site/public/assets/generated/<week>/<type>-<slug>.<ext>`; gitignored dedup cache at `.webster/generated-cache/`.               | 2     |
| 40d | todo   | **#39 integration pattern** — apply worker's stub-when-absent / invoke-when-present flow (Q3 soft dependency). Apply emits `<!-- asset TBD: <type> -->` comments when #40 is unavailable, swaps them for real asset URLs after #40 ships.                 | 1     |

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
