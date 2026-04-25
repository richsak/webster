# Sim council — parameterized demo council fork

This prompt runs one Webster simulation week for one substrate. It is a fork of `prompts/second-wbs-session.md` for demo branches only.

It does not touch production agents, production prompt state, live URLs, localhost, or deploy previews. Sim agents read site files from GitHub MCP at the branch ref passed in `BRANCH`.

## Required environment

```bash
: "${SUBSTRATE:?SUBSTRATE must be lp or site}"
: "${WEEK_DATE:?WEEK_DATE must be set, e.g. 2026-02-01}"
: "${BRANCH:?BRANCH must be set, e.g. demo-sim-lp/w00}"
: "${AGENT_SET:?AGENT_SET must be webster-lp-sim or webster-site-sim}"
: "${CONTEXT_PATH:?CONTEXT_PATH must point to substrate context dir}"
: "${SITE_PATH:?SITE_PATH must point to substrate site dir}"
: "${MEMORY_STORES_JSON:?MEMORY_STORES_JSON must point to context/memory-stores.json}"
: "${SIM_AGENTS_JSON:=context/sim-agents.json}"

case "$SUBSTRATE" in
  lp|site) ;;
  *) echo "ABORT: SUBSTRATE must be lp or site" >&2; exit 1 ;;
esac

case "$AGENT_SET" in
  webster-lp-sim|webster-site-sim) ;;
  *) echo "ABORT: AGENT_SET must be webster-lp-sim or webster-site-sim" >&2; exit 1 ;;
esac

if [[ ! -s "$SIM_AGENTS_JSON" ]]; then
  echo "ABORT: $SIM_AGENTS_JSON missing. Run scripts/register-sim-agents.ts first." >&2
  exit 1
fi

if [[ ! -s "$MEMORY_STORES_JSON" ]]; then
  echo "ABORT: $MEMORY_STORES_JSON missing. Run scripts/provision-memory-stores.ts first." >&2
  exit 1
fi

if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ABORT: ANTHROPIC_API_KEY is exported in your shell." >&2
  echo "Fix: unset it, relaunch, and let this prompt fetch the key from keychain." >&2
  exit 1
fi

ANTHROPIC_API_KEY=$(security find-generic-password -s anthropic-webster -a "$USER" -w 2>/dev/null)
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  echo "ABORT: ANTHROPIC_API_KEY missing from keychain service anthropic-webster." >&2
  exit 1
fi
export ANTHROPIC_API_KEY

ENV_ID=$(cat environments/webster-council-env.id)
API="https://api.anthropic.com/v1"
BETA_HDR="anthropic-beta: managed-agents-2026-04-01"
VERSION_HDR="anthropic-version: 2023-06-01"
mkdir -p tmp/sim-sessions tmp/logs "history/${SUBSTRATE}-demo/${WEEK_DATE}"

echo "SUBSTRATE=$SUBSTRATE WEEK_DATE=$WEEK_DATE BRANCH=$BRANCH AGENT_SET=$AGENT_SET"
```

## Shared helpers

```bash
agent_id() {
  local role="$1"
  jq -er --arg set "$AGENT_SET" --arg role "$role" '.[$set][$role]' "$SIM_AGENTS_JSON"
}

store_id() {
  local role="$1"
  jq -er --arg substrate "$SUBSTRATE" --arg role "$role" '.[$substrate][$role]' "$MEMORY_STORES_JSON"
}

memory_resource() {
  local role="$1"
  local access="$2"
  local instructions="$3"
  jq -cn \
    --arg id "$(store_id "$role")" \
    --arg access "$access" \
    --arg instructions "$instructions" \
    '{type:"memory_store", memory_store_id:$id, access:$access, instructions:$instructions}'
}

create_session() {
  local role="$1"
  local agent="$2"
  local resource_json="$3"
  local title="Webster sim ${SUBSTRATE} ${role} ${WEEK_DATE}"
  jq -cn \
    --arg agent "$agent" \
    --arg env "$ENV_ID" \
    --arg title "$title" \
    --argjson resources "[$resource_json]" \
    '{agent:$agent, environment_id:$env, title:$title, resources:$resources}' \
    | curl -fsS "$API/sessions" \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "$VERSION_HDR" \
      -H "$BETA_HDR" \
      -H "content-type: application/json" \
      --data-binary @- \
    | jq -er '.id'
}

send_message() {
  local session_id="$1"
  local text="$2"
  jq -cn --arg text "$text" '{events:[{type:"user.message",content:[{type:"text",text:$text}]}]}' \
    | curl -fsS "$API/sessions/$session_id/events" \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "$VERSION_HDR" \
      -H "$BETA_HDR" \
      -H "content-type: application/json" \
      --data-binary @- >/dev/null
}

poll_idle() {
  local session_id="$1"
  local label="$2"
  local deadline=$((SECONDS + 1200))
  while (( SECONDS < deadline )); do
    local status
    status=$(curl -fsS "$API/sessions/$session_id" \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "$VERSION_HDR" \
      -H "$BETA_HDR" | jq -r '.status // "unknown"')
    echo "$label $session_id: $status"
    case "$status" in
      idle|completed|stopped) return 0 ;;
      failed|errored) return 1 ;;
    esac
    sleep 30
  done
  echo "TIMEOUT: $label $session_id did not idle" >&2
  return 1
}

base_message() {
  cat <<MSG
Variables for your bootstrap:
BRANCH=$BRANCH
WEEK_DATE=$WEEK_DATE
SUBSTRATE=$SUBSTRATE
CONTEXT_PATH=$CONTEXT_PATH
SITE_PATH=$SITE_PATH

Read site files and context through GitHub MCP get_file_contents at ref=$BRANCH.
Read analytics from history/${SUBSTRATE}-demo/${WEEK_DATE}/analytics.json when relevant.
Do not use live production URLs, external fetches, localhost, shell git, or deployment previews.
Judge against the context files, not against the ugly baseline.
MSG
}
```

## Step 1 — verify synthetic analytics exists

The simulation wrapper generates analytics before this prompt runs. This prompt does not seed mock history.

```bash
ANALYTICS_PATH="history/${SUBSTRATE}-demo/${WEEK_DATE}/analytics.json"
if [[ ! -s "$ANALYTICS_PATH" ]]; then
  echo "ABORT: $ANALYTICS_PATH missing. Run scripts/synthetic-analytics.ts before sim council." >&2
  exit 1
fi
```

## Step 2 — planner

```bash
PLANNER_ID=$(agent_id planner)
PLANNER_RESOURCE=$(memory_resource planner read_write "Planner memory for this substrate simulation.")
PLANNER_SESSION=$(create_session planner "$PLANNER_ID" "$PLANNER_RESOURCE")
send_message "$PLANNER_SESSION" "$(base_message)"
poll_idle "$PLANNER_SESSION" planner
printf '%s\n' "$PLANNER_SESSION" > "tmp/sim-sessions/${SUBSTRATE}-${WEEK_DATE}-planner.txt"
```

## Step 3 — fan out monitor and critics

```bash
roles=(monitor seo-critic brand-voice-critic conversion-critic copy-critic)
if [[ "$SUBSTRATE" == "lp" ]]; then
  roles+=(fh-compliance-critic)
else
  roles+=(licensing-and-warranty-critic)
fi

pids=()
for role in "${roles[@]}"; do
  agent=$(agent_id "$role")
  case "$role" in
    conversion-critic)
      resource=$(memory_resource conversion-critic read_write "Conversion critic memory for this substrate simulation.") ;;
    *)
      # Monitor, SEO, brand-voice, copy, and substrate-specific legal/trust critics
      # intentionally read the shared council memory store; only roles with durable
      # role-specific memory get read_write stores.
      resource=$(memory_resource council read_only "Shared council memory for this substrate simulation.") ;;
  esac
  session=$(create_session "$role" "$agent" "$resource")
  send_message "$session" "$(base_message)"
  printf '%s\n' "$session" > "tmp/sim-sessions/${SUBSTRATE}-${WEEK_DATE}-${role}.txt"
  (
    poll_idle "$session" "$role"
    printf '%s\n' "$?" > "tmp/sim-sessions/${SUBSTRATE}-${WEEK_DATE}-${role}.status"
  ) >"tmp/logs/${SUBSTRATE}-${WEEK_DATE}-${role}.log" 2>&1 &
  pids+=("$!")
done

for pid in "${pids[@]}"; do
  wait "$pid" || true
done

failed_roles=()
for role in "${roles[@]}"; do
  status=$(cat "tmp/sim-sessions/${SUBSTRATE}-${WEEK_DATE}-${role}.status" 2>/dev/null || echo 1)
  if [[ "$status" != "0" ]]; then
    failed_roles+=("$role")
  fi
done
if (( ${#failed_roles[@]} > 0 )); then
  echo "ABORT: failed sim sessions: ${failed_roles[*]}" >&2
  for role in "${failed_roles[@]}"; do
    status=$(cat "tmp/sim-sessions/${SUBSTRATE}-${WEEK_DATE}-${role}.status" 2>/dev/null || echo 1)
    cause=$(tail -20 "tmp/logs/${SUBSTRATE}-${WEEK_DATE}-${role}.log" | grep -E "^(ABORT|ERROR|TIMEOUT|session .*: failed|session .*: errored)" | tail -1 || true)
    echo "- $role status=$status cause=${cause:-see log}" >&2
  done
  for role in "${failed_roles[@]}"; do
    echo "--- $role log ---" >&2
    tail -60 "tmp/logs/${SUBSTRATE}-${WEEK_DATE}-${role}.log" >&2
  done
  exit 1
fi
```

## Step 4 — genealogy probe

```bash
GENEALOGY_RESOURCE=$(memory_resource genealogy read_write "Genealogy memory for critic-spawn decisions in this substrate simulation.")
echo "genealogy memory attached: $GENEALOGY_RESOURCE" > "tmp/logs/${SUBSTRATE}-${WEEK_DATE}-genealogy.log"
# The pure-organic spawn decision remains in scripts/critic-genealogy.ts; the simulation wrapper
# passes substrate-specific findings into that script after this prompt if a live spawn is needed.
```

## Step 5 — redesigner

```bash
REDESIGNER_ID=$(agent_id redesigner)
REDESIGNER_RESOURCE=$(memory_resource redesigner read_write "Redesigner memory for this substrate simulation.")
REDESIGNER_SESSION=$(create_session redesigner "$REDESIGNER_ID" "$REDESIGNER_RESOURCE")
send_message "$REDESIGNER_SESSION" "$(base_message)"
poll_idle "$REDESIGNER_SESSION" redesigner
printf '%s\n' "$REDESIGNER_SESSION" > "tmp/sim-sessions/${SUBSTRATE}-${WEEK_DATE}-redesigner.txt"
```

## Step 6 — visual reviewer

```bash
VISUAL_ID=$(agent_id visual-reviewer)
VISUAL_RESOURCE=$(memory_resource visual-reviewer read_write "Visual-reviewer memory for this substrate simulation.")
VISUAL_SESSION=$(create_session visual-reviewer "$VISUAL_ID" "$VISUAL_RESOURCE")
VISUAL_MESSAGE=$(cat <<MSG
$(base_message)
Screenshot artifacts will be supplied by scripts/run-simulation.ts after local file rendering. If screenshot paths are absent for week 0, write a pending visual-review note instead of blocking.
MSG
)
send_message "$VISUAL_SESSION" "$VISUAL_MESSAGE"
poll_idle "$VISUAL_SESSION" visual-reviewer
printf '%s\n' "$VISUAL_SESSION" > "tmp/sim-sessions/${SUBSTRATE}-${WEEK_DATE}-visual-reviewer.txt"
```

## Step 7 — completion marker

```bash
echo "sim council complete: $SUBSTRATE $WEEK_DATE $BRANCH"
```
