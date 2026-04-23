---
name: webster-critic-author
description: |
  Use when: Creating ONE new critic managed agent end-to-end — from role idea to registered/invokable agent. Tactical companion to `managed-agents-patterns`. Used during Thursday's sprint and LIVE during Genealogy demo beat.
  Triggers: "new critic for webster", "author webster critic", "write critic spec", "spawn critic", "add critic".
---

# Webster Critic Authoring

Writes, registers, and invokes one new Webster critic managed agent.

## Inputs needed

If any is missing, ASK before proceeding:

1. **Role name** — 1-3 words, hyphenated (e.g., `brand-voice`, `fh-compliance`, `social-proof`)
2. **Scope sentence** — one line, what this critic uniquely owns
3. **Model tier** — `haiku` (monitor only) / `sonnet` (critic default) / `opus` (redesigner only)
4. **Severity rubric** — ordered CRITICAL → LOW for this critic's concerns

## Prerequisites (once per workspace)

- `$ANTHROPIC_API_KEY` in env
- Environment registered at `environments/webster-council-env.json` with `.id` written to `environments/webster-council-env.id`
- If env is missing: see `managed-agents-patterns` skill "Environment" section and register it first

## Output shape

```
agents/
└── <role>-critic.json              ← the critic spec (JSON, not YAML)
context/critics/<role>/
├── findings.md                      ← empty findings stub (git-committed)
├── id.txt                           ← Managed Agents API returned agent id
└── version.txt                      ← current agent version (starts at 1)
```

## Steps

### 1. Write the JSON spec

Use the base template in `managed-agents-patterns` (JSON, not YAML). Fill in:

- `name`: `<role>-critic`
- `description`: one-line purpose
- `model`: `claude-sonnet-4-6` (or per tier)
- `system`: string with escaped `\n` — scope, input paths, output format, severity rubric
- `tools`: `[{"type": "agent_toolset_20260401"}]`
- `metadata`: `{"role": "critic", "scope": "<role>"}`

Save to `agents/<role>-critic.json`. Verify it parses: `jq . agents/<role>-critic.json`.

### 2. Initialize per-critic findings

```bash
mkdir -p context/critics/<role>
cat > context/critics/<role>/findings.md <<'EOF'
# Findings — <role>-critic

No runs yet. First council run will populate this file.
EOF
```

The agent will overwrite this on its first run, committing from inside the session.

### 3. Register with Managed Agents API

```bash
AGENT_RESPONSE=$(curl -fsS https://api.anthropic.com/v1/agents \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  --data @agents/<role>-critic.json)

jq -r '.id' <<< "$AGENT_RESPONSE" > context/critics/<role>/id.txt
jq -r '.version' <<< "$AGENT_RESPONSE" > context/critics/<role>/version.txt
```

Verify: `cat context/critics/<role>/id.txt` should show a non-empty agent id (format `agent_...`). If response contains an `error` object, print it and stop — do NOT retry blindly.

### 4. Invoke (test run)

Create a session referencing the agent + Webster environment, then send the first user message.

```bash
AGENT_ID=$(cat context/critics/<role>/id.txt)
ENV_ID=$(cat environments/webster-council-env.id)

SESSION_ID=$(curl -fsS https://api.anthropic.com/v1/sessions \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  -d "{\"agent\": \"$AGENT_ID\", \"environment_id\": \"$ENV_ID\", \"title\": \"<role> test run\"}" \
  | jq -r '.id')

curl -fsS "https://api.anthropic.com/v1/sessions/$SESSION_ID/events" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  -d @- <<EOF
{
  "events": [{
    "type": "user.message",
    "content": [{"type": "text", "text": "Clone https://github.com/richsak/webster, read site/, audit for <your scope>, write findings to context/critics/<role>/findings.md on branch council-test, then commit+push."}]
  }]
}
EOF

# Stream until idle (or use polling via GET /v1/sessions/$SESSION_ID and check status)
curl -N -fsS "https://api.anthropic.com/v1/sessions/$SESSION_ID/stream" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "Accept: text/event-stream"
```

Wait for `session.status_idle` event, then `git pull` on the `council-test` branch to see the committed findings.

### 5. Commit the spec

```bash
git add agents/<role>-critic.json context/critics/<role>/
git commit -m "feat: add <role> critic"
git push
```

**Skip step 5's old "register with redesigner" step** — the redesigner does NOT use `callable_agents` in our public-beta architecture. The orchestrator fans out to critics directly. The new critic is picked up automatically on the next council run because the orchestrator enumerates `context/critics/*/id.txt`.

## For Critic Genealogy (runtime creation mid-council-run)

When the orchestrator detects a pattern no existing critic owns, it runs the same flow inline:

1. Opus 4.7 authors the spec → `agents/<new-role>-critic.json`
2. POST `/v1/agents` → capture `id` to `history/YYYY-MM-DD/genealogy/<new-role>.id`
3. POST `/v1/sessions` referencing the Webster environment ID
4. Send user.message event immediately — don't wait for next week
5. Stream until idle, `git pull` the findings, incorporate into THIS week's redesign proposal
6. Commit spec + session log to `history/YYYY-MM-DD/genealogy/` for judge inspection

This is the DEMO HERO BEAT. A judge watching should see the full flow — "gap → new critic spec → live invocation → improved proposal" — in ≤30 seconds. Works in public beta; no research preview needed.

## Schema gotchas (fail-loud)

- `system_prompt` → use `system`. API rejects the former.
- `toolset: "agent_toolset_20260401"` → use `tools: [{"type": "agent_toolset_20260401"}]`.
- Don't embed `environment:` or `resources:` in the agent spec.
- Don't include `callable_agents:` unless research preview is approved.
- Response field is `id`, not `agent_id`.

## Do

- One critic = one scope. Split if scope touches >1 concern.
- Reuse `managed-agents-patterns` template — don't reinvent the JSON structure.
- Commit findings from INSIDE the session. Memory lives in git.
- For Genealogy: short spec, immediate invocation, visible commit.
- Verify `.id` is non-empty before assuming registration succeeded. Error responses also return 200 in some cases.

## Don't

- Don't register a critic without the env `.id` file present — session creation fails.
- Don't hardcode credentials in the spec. Use session env vars.
- Don't POST the same agent name twice — use `PATCH` (update) to version-bump an existing agent.
- Don't skip the user.message event. Creating a session does NOT start work; it only provisions the container.
