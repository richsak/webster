# Features

> Canonical task list. Operators mark status transitions here as they work.

## Status legend

- `todo` — not started
- `in-progress` — claimed by an operator
- `done` — shipped, validated, merged
- `blocked` — waiting on external or upstream
- `cut` — pre-committed cut per `webster-open-loops` rules

## Stream allocation

See `AGENTS.md` for stream → operator mapping.

---

## Layer 1: Routine + Orchestrator (Stream 1 — Claude Code Opus 4.7)

| # | Status | Feature | Hours |
|---|---|---|---|
| 1 | todo | `routines/weekly-lp-improve.yaml` — Claude Code Routine with weekly cron, GitHub + API triggers, env references | 2 |
| 2 | todo | `webster/orchestrator.ts` — Claude Code CLI entry: reads LP + `history/` + per-critic context, fans out to Managed Agents | 4 |
| 3 | todo | `skills/critic-flow/SKILL.md` — shared universal agent skill (read context dir → critique → write findings → exit) | 2 |
| 4 | todo | Per-critic context pattern: `context/critics/{name}/findings.md` (git-committed memory) | 1 |
| 5 | todo | Run-artifact pattern: `history/YYYY-MM-DD/` with analytics.json, council-output/, synthesis.md, proposal.diff, decision.json | 2 |
| 6 | todo | Branch + PR automation via `gh pr create` with Opus reasoning in PR body | 2 |

## Layer 2: Managed Agent Critics (Stream 2 — Codex heartbeat)

| # | Status | Feature | Hours |
|---|---|---|---|
| 7 | todo | `agents/monitor.yaml` (Sonnet 4.6) — analytics anomaly detection | 1 |
| 8 | todo | 5 specialist critic YAMLs: seo, brand-voice, fh-compliance, conversion, copy (all Sonnet 4.6) | 4 |
| 9 | todo | `agents/redesigner.yaml` (Opus 4.7) — synthesis + proposal generation | 1 |
| 10 | todo | MCP servers integration: GitHub MCP (URL) + our `forge-mini-mcp` (hosted on Cloudflare Workers) | 3 |
| 11 | todo | Environment config (Ubuntu, Node 20, env vars: `ANTHROPIC_API_KEY` + `GITHUB_TOKEN`) | 2 |
| 12 | todo | `callable_agents` parallel fan-out in orchestrator (research preview — test Thursday, fallback to sequential if needed) | 2 |

## Layer 3: Critic Genealogy (Stream 1 — Claude Code Opus 4.7)

| # | Status | Feature | Hours |
|---|---|---|---|
| 13 | todo | Gap detection: Opus scans critic outputs, identifies pattern none addressed | 3 |
| 14 | todo | YAML author: Opus writes new critic spec with model, system, toolset | 2 |
| 15 | todo | Runtime registration: `POST /v1/agents` from orchestrator | 1 |
| 16 | todo | Immediate invocation: `POST /v1/sessions` with new agent ID | 1 |
| 17 | todo | Genealogy trail: commit new YAML + invocation log to `history/{date}/genealogy/` | 1 |

## Layer 4: Onboarding Skill (Stream 3 — Codex heartbeat)

| # | Status | Feature | Hours |
|---|---|---|---|
| 18 | todo | `skills/onboard-smb/SKILL.md` — universal skill entry | 2 |
| 19 | todo | Business context Q&A flow (name, brand voice, persona, offer) → writes `context/business.md` | 2 |
| 20 | todo | Claude Design `.zip` upload → unzip → Opus translates HTML/JSX → Astro via bundle README guide | 3 |
| 21 | todo | DNS branch: Cloudflare (wrangler `custom_domain`) OR external (`.workers.dev` + user CNAME) | 2 |
| 22 | todo | GitHub App install link + Workers Builds API repo connection | 2 |
| 23 | todo | Credential paste: `ANTHROPIC_API_KEY` + account-scoped `CLOUDFLARE_API_TOKEN` → `.env.local` + verify | 2 |
| 24 | todo | First council run trigger (manual invocation for demo) | 1 |

## Layer 5: Substrate + Mock History (Stream 5 — Claude Code)

| # | Status | Feature | Hours |
|---|---|---|---|
| 25 | todo | Fork `certified.richerhealth.ca` Astro source → `site/`, add `@astrojs/cloudflare` adapter + `wrangler.jsonc` | 2 |
| 26 | todo | Analytics pixel → Cloudflare Worker → KV store endpoint | 3 |
| 27 | todo | **10-week mock history seeder** (`scripts/seed-mock-history.ts`) — generates realistic analytics timeline + progressively-improved LP states + dated git commits (backdated 10 weeks) | 4 |
| 28 | todo | Silent secondary substrates — 2 public SMB LP forks in repo (generalization proof without narration) | 2 |

## Layer 6: Meta Video (Stream 4 — Claude Code or Forge)

| # | Status | Feature | Hours |
|---|---|---|---|
| 29 | todo | Remotion setup + composition template | 3 |
| 30 | todo | 5 animated comps: title card, council viz, TAM + 10-week morph, Critic Genealogy diagram, end-card | 6 |
| 31 | todo | Opus-authored narration script `video/script.md` | 1 |
| 32 | todo | Voice record (Richie, Sat AM ~9:17 PDT) | 2 |
| 33 | todo | Final assembly in Descript or CapCut (3-min clean cut) | 3 |

## Layer 7: Polish (Sat-Sun)

| # | Status | Feature | Hours |
|---|---|---|---|
| 34 | todo | README — one-command replay, architecture map, meta-attribution, commit-hash table | 2 |
| 35 | todo | CI green on main (type-check, lint, format, YAML schema, tests) | 1 |
| 36 | todo | MIT LICENSE + NOTICE attribution | 1 |
| 37 | todo | Cerebral Valley submission form | 1 |

---

## Totals

| Layer | # Features | Hours |
|---|---|---|
| Routine + Orchestrator | 6 | 13 |
| Managed Agent Critics | 6 | 13 |
| Critic Genealogy | 5 | 8 |
| Onboarding Skill | 7 | 14 |
| Substrate + Mock History | 4 | 11 |
| Meta video | 5 | 15 |
| Polish | 4 | 5 |
| **TOTAL** | **37** | **79** |

## Cut order (if Friday 6PM behind pace)

1. 28 — silent secondary substrates
2. 30 — 5 comps → 3
3. 12 — callable_agents → sequential `/v1/sessions`
4. 20 — Claude Design translation → skill operates on existing repo only
5. 27 — 10 weeks → 4 weeks

**NEVER CUT**: 13-17 (Critic Genealogy), 18+19 (skill core), 32 (Nicolette/voice), 34 (README).
