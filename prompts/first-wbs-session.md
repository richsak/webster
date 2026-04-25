# First wbs session — Webster Council launch (2026-04-23)

Single-pass dispatcher task: register the environment, register all 7 agents, run an SEO hello-world, verify, commit, exit. No feature-development fan-out this session — pure bootstrap.

**Override default Operating Loop.** Execute steps 1–5 exclusively. Do NOT call `forge isolation list` or parse FEATURES.md rows this session — this is bootstrap, not feature dispatch. Earlier compaction snapshots may incorrectly claim agents/env are already registered; the authoritative pre-launch state is in the latest `.claude/checkpoints/*-pre-launch.md`. Verify by running `find context/ -name id.txt` (should return zero files before Step 2 runs).

## Reference (load only if needed)

- `@.agents/skills/managed-agents-patterns/SKILL.md` — API schema, endpoints, orchestrator fan-out pattern (verified against live API 2026-04-23)
- `@.agents/skills/webster-critic-author/SKILL.md` — per-critic authoring flow
- `@context/ARCHITECTURE.md` — locked architecture
- `@skills/webster-lp-audit/SKILL.md` — shared discipline reference (NOT uploaded in V1; canonical for V2 migration)

## Prerequisites — verify all before Step 1

```bash
# 1a. SAFETY: Anthropic key must NOT be in shell env, otherwise the dispatcher (claude process)
#     bills against $500 API credits instead of Max subscription — and every claude -p / Forge
#     workflow call from this shell also switches to API billing. Drains credits fast.
if [[ -n "$ANTHROPIC_API_KEY" ]]; then
  echo "ERROR: ANTHROPIC_API_KEY is exported in your shell."
  echo "The dispatcher is now billing against API credits, not Max sub."
  echo "Fix: exit wbs, 'unset ANTHROPIC_API_KEY', relaunch wbs, then retry this prompt."
  exit 1
fi

# 1b. Fetch from macOS keychain on demand (never exported)
ANTHROPIC_API_KEY=$(security find-generic-password -s anthropic-webster -a "$USER" -w 2>/dev/null)
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  echo "ANTHROPIC_API_KEY: MISSING from keychain."
  echo "One-time setup: security add-generic-password -U -s anthropic-webster -a \"\$USER\" -w \"sk-ant-...\""
  exit 1
fi
echo "ANTHROPIC_API_KEY: fetched from keychain (Max sub preserved for dispatcher)"

# 2. GitHub token present (required for agents to push findings from inside their container)
[[ -n "$GITHUB_TOKEN" ]] && echo "GITHUB_TOKEN: set" || { echo "GITHUB_TOKEN: MISSING — generate a fine-grained PAT scoped to richsak/webster (Contents: write, Metadata: read) at https://github.com/settings/personal-access-tokens/new"; exit 1; }

# 3. 7 agent specs present
[[ $(ls agents/*.json 2>/dev/null | wc -l) -eq 7 ]] && echo "agents: 7 specs" || { echo "agents: missing"; exit 1; }

# 4. Environment spec present
[[ -f environments/webster-council-env.json ]] && echo "env spec: present" || { echo "env spec: missing"; exit 1; }

# 5. All JSON parses
for f in agents/*.json environments/*.json; do jq -e . "$f" >/dev/null || { echo "parse error: $f"; exit 1; }; done && echo "all JSON: parses"
```

If any check fails, print the error, checkpoint the state, and exit. Do NOT proceed.

## Step 1 — Register the environment

Check for existing env first (name collision returns 400):

```bash
ENV_LIST_BODY=$(mktemp)
ENV_LIST_STATUS=$(curl -sS -o "$ENV_LIST_BODY" -w "%{http_code}" "https://api.anthropic.com/v1/environments" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01") || {
  echo "env list API call failed"
  cat "$ENV_LIST_BODY" >&2
  rm -f "$ENV_LIST_BODY"
  exit 1
}
if [[ ! "$ENV_LIST_STATUS" =~ ^2 ]]; then
  echo "env list API returned HTTP $ENV_LIST_STATUS" >&2
  cat "$ENV_LIST_BODY" >&2
  rm -f "$ENV_LIST_BODY"
  exit 1
fi
jq -e '.data | type == "array"' "$ENV_LIST_BODY" >/dev/null || {
  echo "env list response missing .data array" >&2
  cat "$ENV_LIST_BODY" >&2
  rm -f "$ENV_LIST_BODY"
  exit 1
}
EXISTING=$(jq -r '.data[] | select(.name=="webster-council-env") | .id' "$ENV_LIST_BODY")
rm -f "$ENV_LIST_BODY"

if [[ -n "$EXISTING" ]]; then
  printf '%s
' "$EXISTING" > environments/webster-council-env.id
  echo "env: reusing $EXISTING"
else
  ENV_CREATE_BODY=$(mktemp)
  ENV_CREATE_STATUS=$(curl -sS -o "$ENV_CREATE_BODY" -w "%{http_code}" https://api.anthropic.com/v1/environments \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "anthropic-beta: managed-agents-2026-04-01" \
    -H "content-type: application/json" \
    --data @environments/webster-council-env.json) || {
    echo "env create API call failed" >&2
    cat "$ENV_CREATE_BODY" >&2
    rm -f "$ENV_CREATE_BODY"
    exit 1
  }
  if [[ ! "$ENV_CREATE_STATUS" =~ ^2 ]]; then
    echo "env create API returned HTTP $ENV_CREATE_STATUS" >&2
    cat "$ENV_CREATE_BODY" >&2
    rm -f "$ENV_CREATE_BODY"
    exit 1
  fi
  NEW_ENV_ID=$(jq -r '.id // empty' "$ENV_CREATE_BODY")
  if [[ -z "$NEW_ENV_ID" ]]; then
    echo "env create response missing .id" >&2
    cat "$ENV_CREATE_BODY" >&2
    rm -f "$ENV_CREATE_BODY"
    exit 1
  fi
  printf '%s
' "$NEW_ENV_ID" > environments/webster-council-env.id
  rm -f "$ENV_CREATE_BODY"
fi

# Verify non-empty + sane shape
ENV_ID=$(cat environments/webster-council-env.id)
[[ "$ENV_ID" =~ ^env_ ]] || { echo "env id malformed: $ENV_ID"; exit 1; }
echo "env id: $ENV_ID"
```

## Step 2 — Register the 7 agents

Loop over `agents/*.json`. Check for existing agent by name first. If exists, skip (PATCH is the V2 update path; V1 = first registration only). Save each `.id` to the per-role dir.

```bash
# Resolve role → context dir
role_dir() {
  case "$1" in
    webster-monitor) echo "context/monitor" ;;
    webster-redesigner) echo "context/redesigner" ;;
    *-critic) echo "context/critics/${1%-critic}" ;;
    *) echo "ERROR: unknown role $1"; return 1 ;;
  esac
}

# Pull existing agents once
EXISTING_JSON=$(curl -fsS "https://api.anthropic.com/v1/agents" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01")

for spec in agents/*.json; do
  name=$(jq -r '.name' "$spec")
  dir=$(role_dir "$name") || exit 1
  mkdir -p "$dir"

  # Check for existing
  existing_id=$(echo "$EXISTING_JSON" | jq -r --arg n "$name" '.data[] | select(.name==$n) | .id')
  if [[ -n "$existing_id" ]]; then
    echo "$existing_id" > "$dir/id.txt"
    echo "$name: reusing $existing_id"
    continue
  fi

  # Register new
  resp=$(curl -fsS https://api.anthropic.com/v1/agents \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "anthropic-beta: managed-agents-2026-04-01" \
    -H "content-type: application/json" \
    --data @"$spec")

  id=$(echo "$resp" | jq -r '.id')
  if [[ -z "$id" || "$id" == "null" ]]; then
    echo "$name: registration FAILED"
    echo "$resp" | jq -r '.error // "no error object"' | head -5
    exit 1
  fi
  echo "$id" > "$dir/id.txt"
  echo "$name: registered $id"
done

# Verify all 7
count=$(find context/ -name id.txt | wc -l | tr -d ' ')
[[ "$count" -eq 7 ]] || { echo "expected 7 ids, got $count"; exit 1; }
echo "all 7 agents: registered"
```

## Step 3 — SEO hello-world session

The seo-critic audits the LIVE LP via WebFetch. Variables are passed in the user.message text (agent parses them from there). `GITHUB_TOKEN` is substituted inline so the agent can clone+push.

```bash
mkdir -p tmp/logs
AGENT_ID=$(cat context/critics/seo/id.txt)
ENV_ID=$(cat environments/webster-council-env.id)
BRANCH="council/hello-world-2026-04-23"

# Create session
SESSION_ID=$(curl -fsS https://api.anthropic.com/v1/sessions \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  -d "{\"agent\": \"$AGENT_ID\", \"environment_id\": \"$ENV_ID\", \"title\": \"seo hello-world 2026-04-23\"}" \
  | jq -r '.id')

[[ -n "$SESSION_ID" && "$SESSION_ID" != "null" ]] || { echo "session creation FAILED"; exit 1; }
echo "session: $SESSION_ID"

# Compose user.message with GITHUB_TOKEN inline (session event body; never written to disk)
USER_MSG=$(cat <<EOF
Variables for your bootstrap:
WEBSTER_REPO_URL=https://x-access-token:$GITHUB_TOKEN@github.com/richsak/webster
BRANCH=$BRANCH
WEEK_DATE=2026-04-23
LP_TARGET=https://certified.richerhealth.ca

Execute the SEO audit per your system prompt. Clone, checkout -b \$BRANCH, WebFetch \$LP_TARGET, audit the rendered HTML against your SEO scope, write findings.md, commit + push to origin \$BRANCH.

NOTE: site/ is not yet forked for Webster — the repo has no site/ directory this week. Use WebFetch of \$LP_TARGET as your PRIMARY evidence source. If \`site/\` is empty or missing after clone, skip its Read step and proceed with rendered-HTML analysis only.
EOF
)

# Send user.message. Capture only HTTP status; never persist the request or response body.
EVENT_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "https://api.anthropic.com/v1/sessions/$SESSION_ID/events" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "content-type: application/json" \
  --data "$(jq -cn --arg text "$USER_MSG" '{events:[{type:"user.message",content:[{type:"text",text:$text}]}]}')") || {
  echo "event send API call failed" >&2
  exit 1
}
if [[ ! "$EVENT_STATUS" =~ ^2 ]]; then
  echo "event send API returned HTTP $EVENT_STATUS" >&2
  exit 1
fi

# Stream until idle (with 10-min timeout)
timeout 600 curl -N -fsS "https://api.anthropic.com/v1/sessions/$SESSION_ID/stream" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  -H "Accept: text/event-stream" \
  > tmp/logs/seo-hello-stream.log

# If stream timed out, poll status
status=$(curl -fsS "https://api.anthropic.com/v1/sessions/$SESSION_ID" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: managed-agents-2026-04-01" \
  | jq -r '.status')

echo "session status: $status"
[[ "$status" == "idle" ]] || { echo "session not idle — write checkpoint from current state before retrying"; exit 1; }
```

## Step 4 — Verify the commit landed

```bash
git fetch origin "council/hello-world-2026-04-23"
git checkout "council/hello-world-2026-04-23"
test -f context/critics/seo/findings.md || { echo "findings.md: NOT COMMITTED"; exit 1; }

# Pass criteria
grep -q "^# Findings — Week 2026-04-23" context/critics/seo/findings.md || { echo "header: wrong"; exit 1; }
grep -q "^## Issues identified" context/critics/seo/findings.md || { echo "format: missing Issues section"; exit 1; }
issue_count=$(grep -cE '^- \[(CRITICAL|HIGH|MEDIUM|LOW)\]' context/critics/seo/findings.md || echo 0)
[[ "$issue_count" -ge 3 ]] || { echo "issues: expected ≥3, got $issue_count"; exit 1; }
grep -q "^## Out of scope" context/critics/seo/findings.md || { echo "format: missing Out of scope section"; exit 1; }

echo "hello-world PASS: $issue_count SEO issues committed on $BRANCH"
git checkout main
```

## Step 5 — Checkpoint + commit + exit

```bash
ts=$(date -u +%Y-%m-%dT%H%M%SZ)
cat > ".claude/checkpoints/${ts}-council-launch.md" <<EOF
---
ts: $ts
trigger: dispatch-pass
---

## What happened
Council bootstrap complete. Env registered, 7 agents registered, seo hello-world pass.

## Current state
- env id: $(cat environments/webster-council-env.id)
- agent ids (7): $(find context/ -name id.txt | wc -l | tr -d ' ') files
- hello-world branch: council/hello-world-2026-04-23 — findings.md committed with ≥3 issues
- architecture unchanged from bb789e3

## Next tick
- Author remaining twists B (VoC upgrade w/ Nicolette interview), C (Closed-loop Deploy), E (meta-moment NL→YAML), J (Critic Genealogy live demo)
- Fork certified.richerhealth.ca into site/
- Seed 10-week mock history
EOF

git add environments/webster-council-env.id context/ .claude/checkpoints/
git commit -m "feat: register webster council env + 7 agents, seo hello-world pass"
git push origin main

echo "dispatcher: council bootstrapped (env + 7 agents), seo hello-world PASS, checkpoint written, exiting"
```

## Fail-safes

- **curl error → distill + exit.** Write the error line to the checkpoint. Do NOT retry blindly.
- **Name collision on registration → skip** (V1). PATCH is the V2 update path. See `.agents/skills/managed-agents-patterns/SKILL.md` "Don't POST same name twice."
- **Stream hangs >10 min → poll status.** If `idle`, continue. If not, checkpoint + exit.
- **$ANTHROPIC_API_KEY / $GITHUB_TOKEN never written to disk.** Env-var-only. Never commit, never tmp-file, never echo.
- **No `callable_agents` field in any spec.** Research preview. Our fan-out pattern (Step 3 above, repeated per critic in the real routine) replaces it.
- **Step 2's `PATCH` path is NOT exercised here.** If an agent name already exists with a stale spec, the dispatcher only reuses the id. A separate "update-agent-specs" session will handle versioning.

## Out of scope for this session

- Running the full 6-critic fan-out (this is just the seo hello-world)
- Registering Genealogy-spawned critics
- Opening a PR from redesigner output (no redesigner run this session)
- Forking certified.richerhealth.ca into `site/`
- Seeding 10-week mock analytics

Those are separate wbs sessions.
