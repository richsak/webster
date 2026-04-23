---
name: managed-agents-patterns
description: |
  Use when: Authoring Claude Managed Agent specs for Webster's council (critics, monitor, redesigner). Canonical JSON shape, schema gotchas, env-as-separate-resource pattern, fan-out invocation path (public-beta-compatible).
  Triggers: "new critic spec", "managed agent pattern", "author managed agent", "critic template", "register critic".
---

# Managed Agent Pattern (Webster Council)

Canonical JSON specs for pre-registered Claude Managed Agents that form Webster's Council of 7 (plus redesigner). Schema verified against live API on 2026-04-23.

## Product identity (don't conflate)

We target **Claude Managed Agents** — Anthropic-hosted agent harness. Primary beta header: `managed-agents-2026-04-01`. Endpoints: `/v1/agents`, `/v1/environments`, `/v1/sessions`, `/v1/sessions/{id}/events`.

This is NOT `/v1/messages` — the raw Messages API (no harness).

**Beta header per endpoint (verified 2026-04-23):**
- `POST /v1/environments` → `managed-agents-2026-04-01`
- `POST /v1/agents` → `managed-agents-2026-04-01`
- `POST /v1/sessions` → `managed-agents-2026-04-01`
- `POST /v1/sessions/{id}/events` → `managed-agents-2026-04-01`
- `GET /v1/sessions/{id}/stream` → **`agent-api-2026-03-01`** (different header; registration header is rejected)

Earlier doc treated `agent-api-2026-03-01` as a separate-product header. That was wrong — Managed Agents' stream endpoint happens to delegate to Agent API infrastructure, so the two headers are complementary per-endpoint, not mutually exclusive per-product.

The hackathon prize lane ("Best Use of Claude Managed Agents") wants the hosted harness, which is what we're building against.

## Public beta vs research preview

**Public beta (use freely):**
- Pre-registered agents, environments, sessions, events, MCP, skills, vaults.
- Runtime agent creation via `POST /v1/agents` from the orchestrator session → this powers Critic Genealogy hero beat.

**Research preview (request access at https://claude.com/form/claude-managed-agents):**
- `callable_agents` — agent-to-agent invocation inside the Managed Agents runtime.
- Memory tooling, outcomes, multi-agent orchestration as a managed feature.

**Implication**: Webster uses orchestrator-fan-out (see below) rather than a redesigner with `callable_agents`. Same council architecture; works in public beta without approval.

## Model tier table (cost discipline)

| Role | Model | Why |
|---|---|---|
| `monitor` | `claude-haiku-4-5` | Analytics anomaly detection — cheap, fires first |
| 5 critics (SEO, brand-voice, FH-compliance, conversion, copy) | `claude-sonnet-4-6` | Critic default — quality at moderate cost |
| `redesigner` | `claude-opus-4-7` | Synthesis + proposal generation — quality matters |

Never use Opus 4.7 for critics. Never use Sonnet for the monitor. Tier discipline is part of the demo story.

## Agent spec shape (JSON, not YAML)

Specs are JSON files under `agents/<role>-critic.json` — curl posts them directly with `--data @file.json`. No YAML-to-JSON conversion step.

```json
{
  "name": "<role>-critic",
  "description": "<one-line purpose>",
  "model": "claude-sonnet-4-6",
  "system": "You are a <role> in Webster's landing-page improvement council.\n\n# Scope\nYour job is ONLY <specific responsibility>. You do NOT:\n- Propose redesigns (that's the redesigner's job)\n- Judge other critics (critics are independent)\n- Touch git, deploy, or anything outside reading LP + writing findings\n\n# Input\nAt session start, read from /workspace:\n- `site/` — current landing page source\n- `context/business.md` — brand + business identity\n- `context/critics/<your-name>/findings.md` — your previous findings (memory)\n- `history/last-week/` — last week's run for diff context\n\nThe orchestrator clones the Webster repo into /workspace at session start (see environment setup). You have `git` via bash.\n\n# Output\nWrite findings to `context/critics/<your-name>/findings.md`, then stage and commit:\n  git add context/critics/<your-name>/findings.md\n  git commit -m 'chore(<role>-critic): week YYYY-MM-DD findings'\n  git push\n\nFindings format:\n# Findings — Week YYYY-MM-DD\n\n## Issues identified\n- [CRITICAL|HIGH|MEDIUM|LOW] <one-line issue> — <evidence from LP>\n\n## Patterns observed\n- <recurring pattern across multiple weeks>\n\n## Out of scope (flag for redesigner or Genealogy)\n- <issue you noticed but don't own>\n",
  "tools": [
    { "type": "agent_toolset_20260401" }
  ],
  "mcp_servers": [],
  "metadata": {
    "role": "critic",
    "scope": "<role>"
  }
}
```

**Key fields:**
| Field | Notes |
|---|---|
| `name` | Required. Human-readable. |
| `model` | Required. Full model ID string. 4.5+ models only. |
| `system` | System prompt as a single string. Use `\n` for newlines inside JSON. |
| `tools` | **Array of objects**. `{"type": "agent_toolset_20260401"}` gives the full built-in toolset (bash, file ops, web, grep, glob, edit). NOT `toolset: "..."`. |
| `mcp_servers` | Array of MCP server configs (URL + auth). Empty array is fine. |
| `callable_agents` | **Research preview only**. Do NOT include in base template. |
| `metadata` | Free-form key/value for your own tracking. |

**Response has `id`** (the agent identifier), NOT `agent_id`. Also returns `version` (starts at 1, increments on update).

## Environment (separate resource)

Environments are NOT embedded in the agent spec. Create once per Webster workspace; reuse across sessions.

```json
{
  "name": "webster-council-env",
  "config": {
    "type": "cloud",
    "packages": {
      "apt": ["git", "jq"],
      "npm": ["@astrojs/cloudflare"]
    },
    "networking": {
      "type": "limited",
      "allowed_hosts": [
        "api.github.com",
        "github.com",
        "raw.githubusercontent.com",
        "api.anthropic.com"
      ],
      "allow_mcp_servers": true,
      "allow_package_managers": true
    }
  }
}
```

Register once per workspace:

```bash
curl -fsS https://api.anthropic.com/v1/environments \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  --data @environments/webster-council-env.json \
  | jq -r '.id' > environments/webster-council-env.id
```

**No `github_repository` resource type exists.** Agents clone the repo at session start via bash using a GitHub token passed as env or in a session init event.

## Registration flow (orchestrator-level only)

Agents are registered via `POST /v1/agents` from the ORCHESTRATOR session (Claude Code). NEVER from inside a Managed Agent's own loop.

```bash
AGENT_RESPONSE=$(curl -fsS https://api.anthropic.com/v1/agents \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  --data @agents/brand-voice-critic.json)

jq -r '.id' <<< "$AGENT_RESPONSE" > context/critics/brand-voice/id.txt
jq -r '.version' <<< "$AGENT_RESPONSE" > context/critics/brand-voice/version.txt
```

## Invocation flow (orchestrator fan-out, public beta)

The orchestrator (Claude Code session, Opus 4.7) invokes each critic sequentially by creating a session per critic, sending a user message, and streaming the result. This replaces the research-preview `callable_agents` pattern.

```bash
# 1. Start a session for one critic
SESSION_ID=$(curl -fsS https://api.anthropic.com/v1/sessions \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  -d "{\"agent\": \"$(cat context/critics/brand-voice/id.txt)\", \"environment_id\": \"$(cat environments/webster-council-env.id)\", \"title\": \"brand-voice week $WEEK_TAG\"}" \
  | jq -r '.id')

# 2. Send the user message (triggers the agent)
curl -fsS "https://api.anthropic.com/v1/sessions/$SESSION_ID/events" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  -d @- <<EOF
{
  "events": [{
    "type": "user.message",
    "content": [{"type": "text", "text": "Audit $LP_URL. Commit findings to context/critics/brand-voice/findings.md on branch council/$WEEK_TAG."}]
  }]
}
EOF

# 3. Stream until session.status_idle
curl -N -fsS "https://api.anthropic.com/v1/sessions/$SESSION_ID/stream" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "Accept: text/event-stream" \
  | <process SSE until 'session.status_idle'>
```

Do this for all 6 critics (in parallel — the Session API supports concurrent sessions). Then invoke the redesigner with all findings committed to the branch as input.

## Critic Genealogy (runtime creation, public beta)

The orchestrator detects a pattern no existing critic owns, then at runtime:

1. Opus 4.7 in the orchestrator session authors a new critic spec → `agents/<new-role>-critic.json`
2. POST `/v1/agents` to register → capture `id` in `history/YYYY-MM-DD/genealogy/<new-role>.id`
3. POST `/v1/sessions` with the new `id` + the Webster environment ID
4. Send user.message event: "Audit $LP_URL for <the missed pattern>. Commit findings."
5. Stream until idle, read the committed findings, incorporate into THIS week's redesign proposal
6. Commit `agents/<new-role>-critic.json` + `history/YYYY-MM-DD/genealogy/<new-role>-session.log` for judge inspection

This is the DEMO HERO BEAT. No research-preview gate. Works today in public beta.

## Schema gotchas (learned the hard way)

1. `system` is a single string, NOT `system_prompt`. (API error: "Extra inputs are not permitted".)
2. `tools` is an array of objects (`[{"type": "..."}]`), NOT `toolset: "..."`.
3. Environments are separate resources. Do NOT embed container config in the agent spec.
4. No `resources: [{type: github_repository, ...}]` field. Clone via bash at session start.
5. `callable_agents` triggers research-preview-only validation. Omit from base template.
6. Response returns `id`, not `agent_id`. Update jq extractions.
7. **`allowed_hosts` takes BARE hostnames, not URLs.** `"github.com"` (right) / `"https://github.com"` (wrong). API 400: "contains a URL scheme. Entries must be bare hostnames like google.com." (Verified 2026-04-23.)
8. **`/v1/sessions/{id}/stream` uses a different beta header** than registration. Use `anthropic-beta: agent-api-2026-03-01`, not `managed-agents-2026-04-01`. Wrong header returns `"this API is in beta: add agent-api-2026-03-01 to the anthropic-beta header"`. (Verified 2026-04-23.)
9. **POST response bodies contain raw unescaped newlines inside `system` strings** when curl streams body + trailer together. `jq` chokes on the mixed stream. Workaround: `curl -o /tmp/resp.json -w '%{http_code}' …` and jq on the file, OR use LIST-after-POST to recover the `id` (LIST responses are clean).
10. **Session ID prefix is `sesn_`**, not `sess_`. Event ID prefix is `sevt_`. Don't pattern-match on `sess_`.
11. **Container-side commit signing infra can 400.** In Managed Agents cloud envs, `/tmp/code-sign` handled by the harness may reject commits with HTTP 400 `source: Field required`. If the session needs to push, the agent should set `git config --local commit.gpgsign false` (repo-local scope, NOT `--no-gpg-sign` flag) and push unsigned. Flag it in findings as an infra issue, don't silently bypass via the flag. (Observed 2026-04-23.)

## Do

- Store agent specs as JSON files at `agents/<role>-critic.json` — posts directly to API.
- One critic = one scope. Split if scope touches >1 concern.
- Keep `system` ≤50 lines (escaped newlines). Verbose prompts eat session context.
- Use `agent_toolset_20260401` — full built-in set covers bash/files/web. Don't craft custom toolsets unless needed.
- Commit `context/critics/<role>/findings.md` from INSIDE the session — memory lives in git, not session state.
- Pin environment networking to `limited` with explicit `allowed_hosts`. Default of `unrestricted` is a safety footgun.

## Don't

- Don't include `callable_agents` in any critic spec unless research preview is approved.
- Don't hardcode API keys in the spec. Use env vars in the session or a vault.
- Don't mix Opus and Sonnet tiers for critics — tier discipline is part of the hackathon story.
- Don't skip the environment registration step. Sessions fail without an `environment_id`.
- Don't assume `system_prompt`/`toolset`/embedded env will "work" — they won't; the API rejects them.
