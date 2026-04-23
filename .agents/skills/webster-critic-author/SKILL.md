---
name: webster-critic-author
description: |
  Use when: Creating ONE new critic managed agent end-to-end — from role idea to registered/invokable agent. Tactical companion to `managed-agents-patterns`. Used 8x during Thursday's sprint and LIVE during Genealogy demo beat.
  Triggers: "new critic for webster", "author webster critic", "write critic yaml", "spawn critic", "add critic".
---

# Webster Critic Authoring

Writes, registers, and invokes one new Webster critic managed agent.

## Inputs needed

If any is missing, ASK before proceeding:

1. **Role name** — 1-3 words, hyphenated (e.g., `brand-voice`, `fh-compliance`, `social-proof`)
2. **Scope sentence** — one line, what this critic uniquely owns
3. **Model tier** — `haiku` (monitor only) / `sonnet` (critic default) / `opus` (redesigner only)
4. **Severity rubric** — ordered CRITICAL → LOW for this critic's concerns

## Output shape

```
agents/
└── <role>-critic.yaml               ← the critic spec
context/critics/<role>/
├── findings.md                      ← empty findings stub (git-committed)
└── id.txt                           ← Managed Agents API returned agent_id
```

## Steps

### 1. Write the YAML

Use the base template in `managed-agents-patterns` skill. Fill in:
- `name: <role>-critic`
- `description: <one-line purpose>`
- `model: claude-sonnet-4-6` (or per tier)
- `system_prompt:` including scope, rubric, I/O paths, output format

Save to `agents/<role>-critic.yaml`.

### 2. Initialize per-critic findings

```bash
mkdir -p context/critics/<role>
cat > context/critics/<role>/findings.md <<'EOF'
# Findings — <role>-critic

No runs yet. First council run will populate this file.
EOF
```

### 3. Register with Managed Agents API

```bash
curl -sX POST https://api.anthropic.com/v1/agents \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "Content-Type: application/json" \
  --data @agents/<role>-critic.yaml \
  | jq -r '.agent_id' > context/critics/<role>/id.txt
```

Verify: `cat context/critics/<role>/id.txt` should show a non-empty agent ID.

### 4. Invoke (test run)

```bash
curl -sX POST https://api.anthropic.com/v1/sessions \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "Content-Type: application/json" \
  -d "{\"agent_id\": \"$(cat context/critics/<role>/id.txt)\", \"input\": \"Audit the current LP at /workspace/repo/site\"}"
```

### 5. Register with redesigner

Edit `agents/redesigner.yaml` → append the new critic's `agent_id` to its `callable_agents` array. Re-POST the redesigner to Managed Agents:

```bash
curl -sX POST https://api.anthropic.com/v1/agents \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "Content-Type: application/json" \
  --data @agents/redesigner.yaml
```

### 6. Commit

```bash
git add agents/<role>-critic.yaml context/critics/<role>/ agents/redesigner.yaml
git commit -m "feat: add <role> critic"
```

## For Critic Genealogy (runtime creation mid-council-run)

When the redesigner detects a pattern no existing critic owns, it runs THIS EXACT flow from inside the orchestrator session (NOT from inside its own Managed Agent loop — research preview disallows that):

1. Opus 4.7 authors the new critic YAML to `agents/<new-role>-critic.yaml`
2. POST `/v1/agents` to register
3. Store `agent_id` in `history/YYYY-MM-DD/genealogy/<new-role>.id`
4. Invoke immediately via `/v1/sessions` — doesn't wait for next week
5. Incorporate new critic's findings into THIS week's redesign proposal
6. Commit the new spec to `history/YYYY-MM-DD/genealogy/` for judge inspection

This is the DEMO HERO BEAT. A judge watching should see the full flow — "gap → new critic spec → live invocation → improved proposal" — in ≤30 seconds.

## Do

- One critic = one scope. If the scope touches >1 concern, split it.
- Reuse `managed-agents-patterns` template — don't reinvent YAML structure.
- Commit findings after every run. Memory lives in git, not session state.
- For Genealogy: keep the spec short, the invocation immediate, the commit visible.

## Don't

- Don't register a critic without a findings.md stub. First run will fail.
- Don't hardcode credentials in YAML. Use env vars.
- Don't let critics call other critics. Only redesigner has `callable_agents`.
- Don't skip the redesigner re-registration — new critic is invisible to it until you do.
