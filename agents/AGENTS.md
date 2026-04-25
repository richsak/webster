# Agent specs — invariants and registration rules

> Governs behavior when working inside `agents/`. Every new spec must obey these invariants.

## Spec schema (matches `POST /v1/agents`)

Required fields in every `*.json` spec:

- `name` (string, unique per workspace) — used for idempotent registration
- `model` — exact IDs in `context/ARCHITECTURE.md`:
  - Opus 4.7 — `claude-opus-4-7`
  - Sonnet 4.6 — `claude-sonnet-4-6`
  - Haiku 4.5 — `claude-haiku-4-5-20251001`
- `system` — multi-line string with escaped `\n`; the agent's system prompt
- `tools` — typically `[{"type": "agent_toolset_20260401"}]`
- `metadata` — key/value; include `role` and `substrate` for sim agents

**Forbidden fields** (research-preview only, do not add):

- `callable_agents` — agent-to-agent invocation is research preview; orchestrator fans out via parallel `/v1/sessions`
- `memory` inline on the agent spec — memory stores attach at session creation, not agent registration
- `environment:` or `resources:` inline — environments are a separate resource bound at session creation

## Beta header

All API calls touching these specs use:

```
anthropic-beta: managed-agents-2026-04-01
```

## Registration

- Registration goes through `POST /v1/agents` from the orchestrator (or a `scripts/register-*-agents.ts` helper)
- Agents are registered **once per workspace**, referenced by ID thereafter
- Idempotent by name: before POST, `GET /v1/agents` and check for existing name. **Walk pagination** — `findAgentByName` must handle `next_page` / `has_more` cursors
- Never POST duplicate names — API returns 400
- Both pre-registered base critics AND runtime-created Genealogy critics register the same way

## Environment binding

Environments are a **separate resource** (`POST /v1/environments`). Reference by `environment_id` at session creation (`POST /v1/sessions`), not at agent creation. Do not add environment fields to agent JSON.

## Two agent sets (hackathon expansion)

The existing 9 `webster-*` specs are the **production set**. They run Nicolette's real weekly council. **Do not modify them.**

Sim expansion adds 18 new specs:

- `webster-lp-sim-*` (9) — Richer Health simulation, MCP-native (no WebFetch)
- `webster-site-sim-*` (9) — Northwest Home Renovations simulation, MCP-native. Fifth critic is `licensing-and-warranty-critic` replacing `fh-compliance-critic`

Sim agents read the site via `get_file_contents` (GitHub MCP) at demo branch refs — never WebFetch, never localhost.

## System prompt discipline

- **No hardcoded external URLs** (including `LP_TARGET`). Pass URLs / branch refs via the first user.message.
- **No secrets / tokens in system prompt**. The vault holds tokens; sessions inject them at MCP tool-call time.
- **Bootstrap section at top**: declares what the first user.message will contain (BRANCH, WEEK_DATE, etc.).
- **Scope section**: EXACTLY what this critic is responsible for. No overlap with other critics.

## Memory-store attachment (hackathon expansion)

Memory stores attach at session creation via `resources[]`, not agent registration. Attachment shape:

```json
{
  "type": "memory_store",
  "memory_store_id": "memstore_01...",
  "access": "read_only",
  "instructions": "short description of what this store contains"
}
```

- Max 8 stores per session
- Use `read_only` by default; `read_write` only for agents that must write (planner, redesigner, genealogy when spawning)
- IDs live in `context/memory-stores.json` (produced by `scripts/provision-memory-stores.ts`)

## Validation before committing a new spec

1. Spec validates against the schema (run existing schema tests)
2. `bun run validate` green
3. If a registration script exists for this set, running it twice produces identical output (idempotent)
4. Name collision check: new name doesn't match any existing spec across both sets (grep `agents/*.json` for `"name"`)

## When in doubt

Read `context/VISION.md` and `context/DOMAIN-MODEL.md`. If they don't answer, surface `[STUCK]` to Richie — don't guess at registration semantics.
