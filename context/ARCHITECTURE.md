# Architecture

> Mirrors [[webster-architecture]] in vault. Canonical source is this file for in-repo operators; vault file for cross-session memory.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code Routine (weekly cron, 1h min cadence)              │
│  ↓                                                               │
│  Claude Code Session (orchestrator — Opus 4.7)                  │
│  ├─ reads site/ + history/ + context/critics/*/findings.md     │
│  │                                                               │
│  ├─ fan-out: POST /v1/sessions for each of 6 pre-registered     │
│  │  Managed Agents (parallel), then send user.message event     │
│  │   ├─ monitor (Haiku 4.5) — detects analytics anomalies       │
│  │   ├─ 5 specialist critics (Sonnet 4.6)                       │
│  │   │   ├─ SEO, brand-voice, FH-compliance,                    │
│  │   │   ├─ conversion, copy                                    │
│  │   └─ each critic commits findings.md from inside its session │
│  │                                                               │
│  ├─ redesigner session (Opus 4.7)                                │
│  │   ├─ orchestrator gathers committed findings                 │
│  │   ├─ passes them as input text to redesigner session         │
│  │   └─ redesigner outputs proposal.diff + decision.json        │
│  │                                                               │
│  ├─ Critic Genealogy (runtime creation, public beta)            │
│  │   ├─ detects pattern no existing critic owns                 │
│  │   ├─ authors new critic JSON → commits to repo               │
│  │   ├─ POST /v1/agents (runtime registration)                  │
│  │   └─ POST /v1/sessions (immediate invocation, fan-in)        │
│  │                                                               │
│  └─ opens PR via gh CLI with Opus reasoning in body             │
│                                                                  │
│  Human merges PR in GitHub → webhook → Workers Builds           │
│  → Cloudflare Workers + Static Assets redeploys                 │
│                                                                  │
│  Orchestrator holds GitHub token + Anthropic API key.           │
│  Cloudflare creds are onboarding-only, not runtime.             │
└─────────────────────────────────────────────────────────────────┘
```

**Why fan-out, not `callable_agents`**: agent-to-agent invocation (`callable_agents`) is research preview, not public beta. The orchestrator doing fan-out directly via `/v1/sessions` works in public beta today, with the same council behavior. Request research-preview access at https://claude.com/form/claude-managed-agents if you want to move redesigner-calls-critics later.

## Layer Breakdown

### Layer 1: Routine + Orchestrator

- `routines/weekly-lp-improve.yaml` — Claude Code Routine, weekly cron, wires env + GitHub triggers
- `webster/orchestrator.ts` — Claude Code CLI entry, reads state, fans out, opens PR
- Shared agent skill `skills/critic-flow/SKILL.md` — universal e2e flow: *read context → critique → write findings → exit*
- Per-critic context: `context/critics/{name}/findings.md`
- Run artifacts: `history/YYYY-MM-DD/{analytics.json, council-output/, synthesis.md, proposal.diff, decision.json}`

### Layer 2: Managed Agent Critics (7 pre-registered)

**Environment is a separate resource** (`POST /v1/environments`), registered once per workspace and referenced by ID in every session. There is NO in-agent `environment:` or `resources:` field.

Environment `environments/webster-council-env.json`:
- Base: default Ubuntu cloud container (Node, Python, Go, git pre-installed — see `/docs/en/managed-agents/cloud-containers`)
- Packages: `{apt: [git, jq], npm: [@astrojs/cloudflare]}` as needed
- Networking: `limited` with `allowed_hosts: [api.github.com, github.com, raw.githubusercontent.com, api.anthropic.com]`, `allow_mcp_servers: true`, `allow_package_managers: true`
- No GitHub-repo mount primitive exists — the agent `git clone`s at session start via bash using a `GITHUB_TOKEN` passed in the first user.message

Agent specs (JSON, not YAML — matches `POST /v1/agents` schema):
- `agents/monitor.json` — Haiku 4.5
- `agents/brand-voice-critic.json` — Sonnet 4.6
- `agents/fh-compliance-critic.json` — Sonnet 4.6
- `agents/seo-critic.json` — Sonnet 4.6
- `agents/conversion-critic.json` — Sonnet 4.6
- `agents/copy-critic.json` — Sonnet 4.6
- `agents/redesigner.json` — Opus 4.7

Each spec has: `name`, `model`, `system` (multi-line string with escaped \n), `tools: [{type: agent_toolset_20260401}]`, `metadata`. **No `callable_agents`** (research preview).

### Layer 3: Critic Genealogy (novel mechanic)

Orchestrator detects a pattern no existing critic addressed, authors a new critic JSON spec, registers it via `POST /v1/agents`, invokes via `POST /v1/sessions` + user.message event, streams until `session.status_idle`, commits spec + session log to `history/{date}/genealogy/`.

Works in **public beta** — runtime agent creation is supported without research preview access. Demo hero beat — this is the $5K Creative Exploration prize moment.

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

1. **Agents are registered from the orchestrator session.** `POST /v1/agents` from Claude Code (orchestrator), never from inside a Managed Agent's own loop. Both pre-registered critics AND runtime-created Genealogy critics are registered this way.
2. **Environments are separate resources.** `POST /v1/environments` once per workspace; referenced by `environment_id` in every session.
3. **No `callable_agents`.** Agent-to-agent invocation is research preview. Orchestrator fans out via parallel `/v1/sessions` calls.
4. **State lives in git.** Critics commit findings from inside their sessions. No managed memory stores (also research preview).
5. **Credentials**: orchestrator holds `ANTHROPIC_API_KEY` + `GITHUB_TOKEN`. Sessions receive `GITHUB_TOKEN` in the first user.message so they can `git clone` + push. Cloudflare creds are onboarding-only.
6. **Skill is universal.** Same markdown, Claude Code + claude.ai.
7. **Zero fabricated stats.** Mock analytics framed as POC priors.

## Dependencies

- Anthropic Managed Agents API, beta header `managed-agents-2026-04-01` (public beta — verified live 2026-04-23)
- (Research preview, NOT required for public beta path: `callable_agents`, memory stores, outcomes — request at https://claude.com/form/claude-managed-agents)
- Claude Code (Routines, `/v1/claude_code/routines/{id}/fire`)
- Claude Design (user-facing, bundle `.zip`)
- Cloudflare Workers + Static Assets + Workers Builds
- GitHub (MCP + webhooks)
- Astro 6 + `@astrojs/cloudflare`
- Remotion (video)
