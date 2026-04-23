# Architecture

> Mirrors [[webster-architecture]] in vault. Canonical source is this file for in-repo operators; vault file for cross-session memory.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code Routine (weekly cron, 1h min cadence)              │
│  ↓                                                               │
│  Claude Code Session (orchestrator — Opus 4.7)                  │
│  ├─ reads site/ + history/ + context/critics/*/findings.md     │
│  ├─ invokes 6 pre-registered Managed Agents via callable_agents │
│  │   ├─ monitor (Sonnet 4.6) — detects analytics anomalies      │
│  │   ├─ 5 specialist critics (Sonnet 4.6, parallel)            │
│  │   │   ├─ SEO                                                 │
│  │   │   ├─ brand-voice                                         │
│  │   │   ├─ FH-compliance                                       │
│  │   │   ├─ conversion                                          │
│  │   │   └─ copy                                                │
│  │   └─ redesigner (Opus 4.7) — synthesis + proposal            │
│  ├─ detects pattern no critic caught (Critic Genealogy)        │
│  │   ├─ authors new critic YAML → commits to repo              │
│  │   ├─ POST /v1/agents (runtime registration)                  │
│  │   └─ POST /v1/sessions (immediate invocation)                │
│  ├─ writes proposal.diff + decision.json to history/            │
│  └─ opens PR via gh CLI with Opus reasoning in body             │
│                                                                  │
│  Human merges PR in GitHub → webhook → Workers Builds           │
│  → Cloudflare Workers + Static Assets redeploys                 │
│                                                                  │
│  Scheduled agent holds ONLY GitHub token.                       │
│  Cloudflare creds are onboarding-only, not runtime.             │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Breakdown

### Layer 1: Routine + Orchestrator

- `routines/weekly-lp-improve.yaml` — Claude Code Routine, weekly cron, wires env + GitHub triggers
- `webster/orchestrator.ts` — Claude Code CLI entry, reads state, fans out, opens PR
- Shared agent skill `skills/critic-flow/SKILL.md` — universal e2e flow: *read context → critique → write findings → exit*
- Per-critic context: `context/critics/{name}/findings.md`
- Run artifacts: `history/YYYY-MM-DD/{analytics.json, council-output/, synthesis.md, proposal.diff, decision.json}`

### Layer 2: Managed Agent Critics (7 pre-registered)

Environment config (set via Managed Agents editor UI):
- Base: Ubuntu 22.04, Node 20+, Python 3.12+
- Env vars: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` (no Cloudflare token — not needed at runtime)
- Networking: limited, `allowed_hosts: [api.anthropic.com, api.github.com, our-mcp-domain]`
- MCP servers: GitHub MCP (URL) + custom `forge-mini-mcp` (hosted on Cloudflare Workers)

Agent YAMLs:
- `agents/monitor.yaml` — Sonnet 4.6
- `agents/critic-seo.yaml` — Sonnet 4.6
- `agents/critic-brand-voice.yaml` — Sonnet 4.6
- `agents/critic-fh-compliance.yaml` — Sonnet 4.6
- `agents/critic-conversion.yaml` — Sonnet 4.6
- `agents/critic-copy.yaml` — Sonnet 4.6
- `agents/redesigner.yaml` — Opus 4.7

### Layer 3: Critic Genealogy (novel mechanic)

Orchestrator detects a pattern no existing critic addressed, authors a new critic YAML, registers it via `POST /v1/agents`, invokes via `POST /v1/sessions`, commits YAML + invocation log to `history/{date}/genealogy/`.

Demo hero beat — this is the $5K Creative Exploration prize moment.

### Layer 4: Onboarding Skill

`skills/onboard-smb/SKILL.md` — universal markdown skill, works in Claude Code + claude.ai.

Flow:
1. Business Q&A → writes `context/business.md`
2. Claude Design `.zip` upload → Opus translates HTML/JSX → Astro
3. DNS branch: "is your domain on Cloudflare?" → wrangler `custom_domain` OR `.workers.dev` + user CNAME
4. GitHub App install (dashboard click) + Workers Builds API wiring
5. Credential paste: `ANTHROPIC_API_KEY` + `CLOUDFLARE_API_TOKEN` → `.env.local`
6. Trigger first council run

### Layer 5: Substrate + Mock History

- `site/` — forked `certified.richerhealth.ca` Astro source + `@astrojs/cloudflare` adapter + `wrangler.jsonc`
- Analytics pixel → Cloudflare Worker → KV endpoint
- **10-week mock history seeder** (`scripts/seed-mock-history.ts`): generates analytics timeline + council runs + progressively-improved LP states, committed backdated via `GIT_AUTHOR_DATE` / `GIT_COMMITTER_DATE`
- 2 silent secondary SMB LP forks (generalization-shown-not-narrated)

### Layer 6: Meta Video

- Remotion template + 5 comps (title, council viz, TAM+10wk morph, Genealogy diagram, end-card)
- Opus-authored narration script (`video/script.md`)
- Voice: Richie's own, Sat AM record
- Final assembly in Descript or CapCut, 3-min clean cut
- End-card: commit hashes for Claude-authored assets

### Layer 7: Polish

- README, architecture map, meta-attribution, commit-hash table
- CI green (GitHub Actions)
- MIT LICENSE + NOTICE
- Cerebral Valley submission form

## Key Invariants

1. **Agents are pre-registered.** Runtime creation via `/v1/agents` is only from outside-the-agent-loop (Claude Code session level).
2. **State lives in git.** No memory stores, no custom persistence.
3. **Credentials never reach scheduled agent.** Cloudflare is onboarding-only. Runtime agent holds only GitHub token.
4. **Skill is universal.** Same markdown, Claude Code + claude.ai.
5. **Zero fabricated stats.** Mock analytics framed as POC priors.

## Dependencies

- Anthropic platform API (Managed Agents, beta header `managed-agents-2026-04-01`)
- Claude Code (Routines, `/v1/claude_code/routines/{id}/fire`)
- Claude Design (user-facing, bundle `.zip`)
- Cloudflare Workers + Static Assets + Workers Builds
- GitHub (MCP + webhooks)
- Astro 6 + `@astrojs/cloudflare`
- Remotion (video)
