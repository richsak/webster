# Features

> Canonical task list. Operators mark status transitions here as they work.

## Status legend

- `todo` — not started
- `in-progress` — claimed by an operator
- `done` — shipped, validated, merged
- `blocked` — waiting on external or upstream
- `cut` — pre-committed cut per `webster-open-loops` rules

## Current submission state (2026-04-23)

- **Done**: 25
- **In-progress**: 1 (live run artifacts in `history/`)
- **Blocked**: 5 (demo video — Richie voice)
- **Cut**: 7 (out of submission scope; rationale inline)
- **Todo**: 1 (Cerebral Valley submission form — Richie action)

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

| #   | Status | Feature                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Hours |
| --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 38  | todo   | Fork `certified.richerhealth.ca` → `site/` — un-cut of #25 for v2. Gives the apply step a target. Options: HTML snapshot via headless fetch, or Astro-source recovery from the client repo. Also unlocks rendered before/after screenshots for demo purposes.                                                                                                                                                                                                                                                                                                                                                                                 | 1-2   |
| 39  | todo   | **Apply step + review/fix loop — NEEDS PLANNING.** Worker reads latest `history/<week>/proposal.md` + `decision.json`, mutates `site/` per the selected issues, runs a Forge-style review→fix→re-review loop on the resulting diff, opens a second "apply" PR with real code changes (separate from the brief PR this session just merged). Open questions: (a) which worker runtime (Pi/Codex/`claude -p` subscription?), (b) how the review step composes with existing critic findings vs. a new code-focused reviewer, (c) iteration cap + drift protection, (d) what counts as "done" (lint+type+visual-regression vs. critic sign-off). | TBD   |

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
