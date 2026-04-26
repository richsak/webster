# Architecture

> Mirrors [[webster-architecture]] in vault. Canonical source is this file for in-repo operators; vault file for cross-session memory.
>
> **Submission state**: Layers 1–4 + Layer 7 shipped. Layer 5 (`site/` fork + analytics pixel + `scripts/seed-mock-history.ts`) is scoped out for submission — the mock seeder is inlined in `prompts/second-wbs-session.md` Step 1 instead of a separate script, and the redesigner emits `proposal.md` instead of `proposal.diff`. Layer 6 (video) is blocked on Richie's voice record. See `context/FEATURES.md` for per-row status.

## System Overview

```text
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

**Why fan-out, not `callable_agents`**: agent-to-agent invocation (`callable_agents`) is research preview, not public beta. The orchestrator doing fan-out directly via `/v1/sessions` works in public beta today, with the same council behavior. Request research-preview access at <https://claude.com/form/claude-managed-agents> if you want to move redesigner-calls-critics later.

## Layer Breakdown

### Layer 1: Routine + Orchestrator

- `routines/weekly-lp-improve.yaml` — cut from submission; weekly trigger is manual `wbs @prompts/second-wbs-session.md`
- `prompts/second-wbs-session.md` — bash-in-markdown orchestrator (replaces the planned `webster/orchestrator.ts`), reads state, fans out, runs genealogy, opens PR
- Shared agent skill `skills/webster-lp-audit/SKILL.md` — universal e2e flow: _read context → critique → write findings → exit_
- Per-critic context: `context/critics/{name}/findings.md`
- Run artifacts: `history/YYYY-MM-DD/{analytics.json, council-output/, synthesis.md, proposal.md, decision.json}`

### Layer 2: Managed Agent Critics (7 pre-registered)

**Environment is a separate resource** (`POST /v1/environments`), registered once per workspace and referenced by ID in every session. There is NO in-agent `environment:` or `resources:` field.

Environment `environments/webster-council-env.json`:

- Base: default Ubuntu cloud container (Node, Python, Go, git pre-installed — see `/docs/en/managed-agents/cloud-containers`)
- Packages: `{apt: [git, jq], npm: [@astrojs/cloudflare]}` as needed
- Networking: `limited` with `allowed_hosts: [api.github.com, github.com, raw.githubusercontent.com, api.anthropic.com]`, `allow_mcp_servers: true`, `allow_package_managers: true`
- No GitHub-repo mount primitive exists — the agent `git clone`s at session start via bash using a `GITHUB_TOKEN` passed in the first user.message

Agent specs (JSON, not YAML — matches `POST /v1/agents` schema):

- `agents/webster-monitor.json` — Haiku 4.5
- `agents/brand-voice-critic.json` — Sonnet 4.6
- `agents/fh-compliance-critic.json` — Sonnet 4.6
- `agents/seo-critic.json` — Sonnet 4.6
- `agents/conversion-critic.json` — Sonnet 4.6
- `agents/copy-critic.json` — Sonnet 4.6
- `agents/webster-redesigner.json` — Opus 4.7

Each spec has: `name`, `model`, `system` (multi-line string with escaped \n), `tools: [{type: agent_toolset_20260401}]`, `metadata`. **No `callable_agents`** (research preview).

### Layer 3: Critic Genealogy (novel mechanic)

Orchestrator detects a pattern no existing critic addressed, authors a new critic JSON spec, registers it via `POST /v1/agents`, invokes via `POST /v1/sessions` + user.message event, streams until `session.status_idle`, commits spec + session log to `history/{date}/genealogy/`.

Works in **public beta** — runtime agent creation is supported without research preview access. Demo hero beat — this is the $5K Creative Exploration prize moment.

### Layer 4: Onboarding Skill

`skills/webster-onboarding/SKILL.md` — universal markdown skill, works in Claude Code + claude.ai.

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

### Local LP demo synthetic measurement schema

This applies to local Claude Code LP simulation artifacts under `local-runs/lp-council/<run-id>/`. It does **not** change production analytics ingestion.

#### `history/wNN/analytics.json`

Schema remains unchanged. Future sessions should continue treating this as Webster's mock 5000-user panel shape:

```ts
{
  version_sha: string;
  site_signature: string;
  substrate: "lp" | "site";
  week: number;
  weekDate: string;
  sessions: number;
  bounce_rate: number;
  avg_time_s: number;
  scroll_depth_25: number;
  scroll_depth_50: number;
  scroll_depth_75: number;
  scroll_depth_100: number;
  cta_clicks: Record<string, number>;
  persona_metrics: Array<{
    persona_id: string;
    sessions: number;
    bounce_rate: number;
    cta_clicks: number;
    avg_time_s: number;
  }>;
  section_engagement: Array<{
    section: string;
    views: number;
    avg_time_s: number;
    dropoff_rate: number;
  }>;
  events: Array<{
    version_sha: string;
    metric: string;
    value: number;
    timestamp: string;
  }>;
}
```

#### `history/wNN/heatmap.json`

`heatmap.json` is the artifact that now carries additional neutral layout/reach measurements. The schema version is `layout-map-plus-analytics-v2`.

Top-level shape:

```ts
{
  week: string;
  synthetic: true;
  model: "layout-map-plus-analytics-v2";
  disclaimer: string;
  measurement_note: string; // explicitly says metrics contain no redesign instructions
  analytics_version_sha: string;
  sessions: number;
  breakpoints: Array<BreakpointHeatmap>;
}
```

Each `BreakpointHeatmap`:

```ts
{
  breakpoint: string; // mobile | tablet | desktop today
  width: number;
  document_height: number;
  layout_metrics: {
    document_height_px: number;
    viewport_height_px: number;
    viewport_count: number;
    scroll_depth_25: number;
    scroll_depth_50: number;
    scroll_depth_75: number;
    scroll_depth_100: number;
    sections: Array<{
      id: string;
      label: string;
      top_px: number;
      height_px: number;
      height_share: number;
      estimated_reach_rate: number;
      source: "section_engagement" | "scroll_curve";
    }>;
    primary_ctas: Array<{
      id: string;
      label: string;
      top_px: number;
      order: number;
      estimated_reach_rate: number;
      estimated_click_rate: number;
    }>;
  }
  regions: Array<{
    kind: "section" | "cta";
    id: string;
    label: string;
    rect: { x: number; y: number; width: number; height: number };
    intensity: number;
    reason: string;
  }>;
  svg: string;
}
```

Policy: these fields are allowed to expose objective measurement signals such as document height, section reach, CTA reach, and click rate. They must not contain instructions like "shorten the page" or "move booking earlier"; agents infer from measurements.

#### Production parity note

The local LP council mock proved the desired learning loop, but it also exposed a parity risk: several local Claude Code role agents stalled or returned early during read-heavy planner/critic/redesigner turns, and the operator/runner completed artifacts in clearly marked fallback paths. Before presenting this as equivalent to production Webster, review the Managed Agent/sim runtime and make sure it can execute the same artifact loop without hidden operator completion:

```text
previous analytics + heatmap/layout metrics
→ planner hypothesis / falsification note
→ critics
→ redesigner proposal + decision + patches
→ browser screenshots / visual review
→ analytics adjustment
→ synthetic heatmap
→ validation
→ next-week context
```

Production/sim agents should receive the same evidence order, especially prior heatmap layout metrics and explicit falsification outcomes. If needed, update Managed Agent prompts, max-turn budgets, or orchestration so the live/sim council can match the mock's behavior without relying on local fallback artifact writing.

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
- (Research preview, NOT required for public beta path: `callable_agents`, memory stores, outcomes — request at <https://claude.com/form/claude-managed-agents>)
- Claude Code (Routines, `/v1/claude_code/routines/{id}/fire`)
- Claude Design (user-facing, bundle `.zip`)
- Cloudflare Workers + Static Assets + Workers Builds
- GitHub (MCP + webhooks)
- Astro 6 + `@astrojs/cloudflare`
- Remotion (video)
