# Second wbs session — full council fan-out + redesigner proposal

> **Override default Operating Loop.** This is a council-run session. Execute the steps below end-to-end. Do NOT call `forge isolation list`, do NOT scan `FEATURES.md` for `todo` rows, do NOT enter a feature-implementation loop.

## What this session does

Runs the full Webster council ONCE end-to-end:

1. Seeds 10 weeks of mock analytics history (if missing) so the monitor has baselines.
2. Prepares `council/$WEEK_DATE` as a shared working branch.
3. Fans out 6 parallel Managed Agent sessions — monitor + 5 critics — all committing to that branch via GitHub MCP.
4. Verifies findings, then runs Critic Genealogy — if Opus 4.7 detects a scope no existing critic owns, it spawns a new critic at runtime, registers it, and invokes it on the same branch (fail-open).
5. Runs the redesigner, which reads all findings (including any spawned-critic output) and commits `history/$WEEK_DATE/proposal.md` + `decision.json` to the branch.
6. Opens a draft PR and writes a completion checkpoint.

**Expected runtime:** 30–45 min wall-clock (parallel critics ~15 min + genealogy 0–10 min + redesigner ~10 min + I/O).
**Expected API cost:** ~$0.13–0.20 (6 parent sessions + ~$0.03 genealogy probe + optional 1 spawned-critic session + redesigner).

## Pre-flight (MANDATORY — do not skip)

```bash
# 1. ANTHROPIC_API_KEY must NOT be in shell env — it would silently bill
#    `claude -p` and any Forge call against API credits instead of the Max sub.
if [[ -n "$ANTHROPIC_API_KEY" ]]; then
  echo "ABORT: ANTHROPIC_API_KEY is exported in your shell."
  echo "Fix: exit wbs, run 'unset ANTHROPIC_API_KEY', relaunch wbs, retry this prompt."
  exit 1
fi

# 2. Fetch the key from macOS keychain for the duration of this bash scope only.
ANTHROPIC_API_KEY=$(security find-generic-password -s anthropic-webster -a "$USER" -w 2>/dev/null)
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  echo "ABORT: ANTHROPIC_API_KEY missing from keychain."
  echo "One-time setup: security add-generic-password -U -s anthropic-webster -a \"\$USER\" -w \"sk-ant-...\""
  exit 1
fi
export ANTHROPIC_API_KEY  # scoped to this bash — the outer wbs process stays clean

# 3. GITHUB_TOKEN is NO LONGER needed in user.message or as env.
#    The vault holds the PAT; sessions inject it at MCP tool-call time.
#    Do not check for it, do not use it.

# 4. Registration artifacts must exist (session 1 output).
REQUIRED=(
  "environments/webster-council-env.id"
  "context/monitor/id.txt"
  "context/critics/brand-voice/id.txt"
  "context/critics/fh-compliance/id.txt"
  "context/critics/seo/id.txt"
  "context/critics/conversion/id.txt"
  "context/critics/copy/id.txt"
  "context/redesigner/id.txt"
)
MISSING=()
for f in "${REQUIRED[@]}"; do
  [[ -s "$f" ]] || MISSING+=("$f")
done
if (( ${#MISSING[@]} > 0 )); then
  echo "ABORT: registration artifacts missing:"
  printf '  - %s\n' "${MISSING[@]}"
  echo "Run session 1 first (prompts/first-wbs-session.md), or restore from a prior checkpoint."
  exit 1
fi

mkdir -p tmp/logs tmp/sessions
```

## Session constants

```bash
WEEK_DATE=$(date -u +%Y-%m-%d)
PREV_WEEK_DATE=$(date -u -v-7d +%Y-%m-%d)
BRANCH="council/$WEEK_DATE"
LP_TARGET="https://certified.richerhealth.ca"
VAULT_ID="vlt_011CaLe2pEofWQptxQyV4UMd"   # webster vault, holds GitHub PAT
ENV_ID=$(cat environments/webster-council-env.id)

# Agent IDs
MONITOR_ID=$(cat context/monitor/id.txt)
BRAND_VOICE_ID=$(cat context/critics/brand-voice/id.txt)
FH_COMPLIANCE_ID=$(cat context/critics/fh-compliance/id.txt)
SEO_ID=$(cat context/critics/seo/id.txt)
CONVERSION_ID=$(cat context/critics/conversion/id.txt)
COPY_ID=$(cat context/critics/copy/id.txt)
REDESIGNER_ID=$(cat context/redesigner/id.txt)

API="https://api.anthropic.com/v1"
BETA_HDR="anthropic-beta: managed-agents-2026-04-01"
VERSION_HDR="anthropic-version: 2023-06-01"

echo "WEEK_DATE=$WEEK_DATE  BRANCH=$BRANCH  LP_TARGET=$LP_TARGET"
echo "ENV_ID=$ENV_ID  VAULT_ID=$VAULT_ID"
```

## Step 1 — Seed 10-week mock analytics history (2 min; idempotent)

Monitor needs prior-week baselines to compute WoW deltas. If history is missing, it will write "Week 1 baseline: no prior week" and skip anomaly detection — survivable but wastes monitor spend.

```bash
SEED_NEEDED=false
for i in $(seq 1 10); do
  DATE=$(date -u -v-${i}w +%Y-%m-%d)
  [[ -f "history/$DATE/analytics.json" ]] || { SEED_NEEDED=true; break; }
done

if $SEED_NEEDED; then
  echo "Seeding 10 weeks of mock analytics..."
  for i in $(seq 1 10); do
    DATE=$(date -u -v-${i}w +%Y-%m-%d)
    mkdir -p "history/$DATE"

    # Plausible small-wellness-biz shape with slight downtrend in recent 2 weeks
    # so the monitor fires on CURRENT vs PREV comparison.
    if [[ $i -le 2 ]]; then
      SESSIONS=$((900 + RANDOM % 200))    # ~900–1100 — recent dip
      CONV=$((7 + RANDOM % 4))             # 7–10 — recent drop
      BOUNCE=$((62 + RANDOM % 6))          # 62–68% — recent rise
    else
      SESSIONS=$((1100 + RANDOM % 300))   # ~1100–1400 — baseline
      CONV=$((10 + RANDOM % 6))            # 10–15 — baseline
      BOUNCE=$((50 + RANDOM % 8))          # 50–58% — baseline
    fi

    jq -n \
      --arg date "$DATE" \
      --arg sessions "$SESSIONS" \
      --arg conv "$CONV" \
      --arg bounce "$BOUNCE" \
      '{
        week_ending: $date,
        sessions: ($sessions | tonumber),
        conversions: ($conv | tonumber),
        bounce_rate_pct: ($bounce | tonumber),
        traffic_sources: {
          organic: 0.50,
          direct: 0.25,
          social: 0.15,
          referral: 0.10
        }
      }' > "history/$DATE/analytics.json"
  done

  # Add THIS week's file too so the monitor has something to compare against
  mkdir -p "history/$WEEK_DATE"
  jq -n --arg date "$WEEK_DATE" '{
    week_ending: $date,
    sessions: 850,
    conversions: 6,
    bounce_rate_pct: 67,
    traffic_sources: { organic: 0.42, direct: 0.28, social: 0.18, referral: 0.12 }
  }' > "history/$WEEK_DATE/analytics.json"

  git add history/
  git commit -m "chore(history): seed 10 weeks mock analytics + week $WEEK_DATE baseline"
  git push origin main
else
  echo "History already present; skipping seed."
fi
```

## Step 2 — Prepare shared branch (1 min)

All 6 parallel workers + the redesigner commit to `$BRANCH`. The critics' system prompts already create-or-skip the branch via `create_branch` MCP (422 on exists = proceed), so this local setup is about keeping your working tree consistent, not about creating the branch remotely.

```bash
git checkout main
git pull
git fetch origin
if git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
  echo "Branch $BRANCH already exists on origin — reusing"
  git checkout -B "$BRANCH" "origin/$BRANCH"
else
  git checkout -B "$BRANCH" main
  git push -u origin "$BRANCH"
fi
```

## Step 3 — Fan-out: 6 parallel Managed Agent sessions (15–20 min)

Helper function for one session end-to-end. Wraps: create session with vault, send user.message, poll until status idle/completed.

```bash
# Args: $1=label  $2=agent_id  $3=user_message_text
# Writes session id to tmp/sessions/$1.id and full log to tmp/logs/$1.log
run_agent_session() {
  local LABEL="$1" AGENT_ID="$2" MSG="$3"
  local LOG="tmp/logs/$LABEL.log"
  local IDFILE="tmp/sessions/$LABEL.id"
  : > "$LOG"

  # 1. Create session attached to vault
  local SESSION_ID
  SESSION_ID=$(curl -fsS "$API/sessions" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "$VERSION_HDR" -H "$BETA_HDR" \
    -H "content-type: application/json" \
    -d "$(jq -n --arg a "$AGENT_ID" --arg e "$ENV_ID" --arg v "$VAULT_ID" --arg t "$LABEL $WEEK_DATE" \
          '{agent: $a, environment_id: $e, vault_ids: [$v], title: $t}')" \
    2>>"$LOG" | jq -r '.id')

  if [[ -z "$SESSION_ID" || "$SESSION_ID" == "null" ]]; then
    echo "ERROR: failed to create session for $LABEL" | tee -a "$LOG"
    return 1
  fi
  echo "$SESSION_ID" > "$IDFILE"
  echo "[$LABEL] session=$SESSION_ID" >> "$LOG"

  # 2. Send user.message (triggers agent to start running)
  curl -fsS "$API/sessions/$SESSION_ID/events" \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "$VERSION_HDR" -H "$BETA_HDR" \
    -H "content-type: application/json" \
    -d "$(jq -n --arg text "$MSG" '{events: [{type: "user.message", content: [{type: "text", text: $text}]}]}')" \
    >>"$LOG" 2>&1

  # 3. Poll every 30s until idle OR 20-min timeout
  local DEADLINE=$(( $(date +%s) + 1200 ))
  while (( $(date +%s) < DEADLINE )); do
    local STATUS
    STATUS=$(curl -fsS "$API/sessions/$SESSION_ID" \
      -H "x-api-key: $ANTHROPIC_API_KEY" \
      -H "$VERSION_HDR" -H "$BETA_HDR" \
      2>>"$LOG" | jq -r '.status // "unknown"')
    echo "[$LABEL] status=$STATUS $(date -u +%T)" >> "$LOG"
    case "$STATUS" in
      idle|completed|stopped) return 0 ;;
      failed|errored)         echo "[$LABEL] agent failed" >> "$LOG"; return 1 ;;
    esac
    sleep 30
  done
  echo "[$LABEL] TIMEOUT after 20min" >> "$LOG"
  return 2
}
```

Launch all 6 in parallel:

```bash
# Messages — keep them tight; agents have full instructions in their system prompt.
MSG_CRITIC="BRANCH=$BRANCH
WEEK_DATE=$WEEK_DATE
LP_TARGET=$LP_TARGET"

MSG_MONITOR="BRANCH=$BRANCH
WEEK_DATE=$WEEK_DATE
PREV_WEEK_DATE=$PREV_WEEK_DATE"

run_agent_session monitor          "$MONITOR_ID"         "$MSG_MONITOR"  & PIDS+=($!)
run_agent_session brand-voice      "$BRAND_VOICE_ID"     "$MSG_CRITIC"   & PIDS+=($!)
run_agent_session fh-compliance    "$FH_COMPLIANCE_ID"   "$MSG_CRITIC"   & PIDS+=($!)
run_agent_session seo              "$SEO_ID"             "$MSG_CRITIC"   & PIDS+=($!)
run_agent_session conversion       "$CONVERSION_ID"      "$MSG_CRITIC"   & PIDS+=($!)
run_agent_session copy             "$COPY_ID"            "$MSG_CRITIC"   & PIDS+=($!)

# Collect per-agent exit codes (0=ok, 1=failed, 2=timeout)
declare -A RESULT
LABELS=(monitor brand-voice fh-compliance seo conversion copy)
for i in "${!PIDS[@]}"; do
  wait "${PIDS[$i]}"
  RESULT["${LABELS[$i]}"]=$?
done

echo ""
echo "── Fan-out results ─────────────────────────"
for L in "${LABELS[@]}"; do
  case "${RESULT[$L]}" in
    0) echo "  ✓ $L" ;;
    1) echo "  ✗ $L — failed (see tmp/logs/$L.log)" ;;
    2) echo "  ⧗ $L — timed out" ;;
  esac
done
```

## Step 4 — Verify findings (2 min)

Fetch the branch, confirm each agent actually wrote a non-stub findings file.

```bash
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

FILES=(
  context/monitor/alerts.md
  context/critics/brand-voice/findings.md
  context/critics/fh-compliance/findings.md
  context/critics/seo/findings.md
  context/critics/conversion/findings.md
  context/critics/copy/findings.md
)

SUCCEEDED=()
STUBBED=()
for f in "${FILES[@]}"; do
  if grep -q "No runs yet\." "$f" 2>/dev/null; then
    STUBBED+=("$f")
  else
    SUCCEEDED+=("$f")
  fi
done

echo "Findings with content: ${#SUCCEEDED[@]}/${#FILES[@]}"
printf '  ✓ %s\n' "${SUCCEEDED[@]}"
if (( ${#STUBBED[@]} > 0 )); then
  printf '  ✗ %s (still stub)\n' "${STUBBED[@]}"
fi

# Abort redesigner if too few critics contributed
if (( ${#SUCCEEDED[@]} < 3 )); then
  echo "ABORT: only ${#SUCCEEDED[@]} findings files have content. Need ≥3 for redesigner."
  echo "Check tmp/logs/ for what went wrong; fix and re-run from Step 3."
  exit 1
fi

# Run our own gate against what the critics wrote — catches format drift
bun scripts/validate-findings.ts
```

## Step 4.5 — Critic Genealogy (0–10 min; fail-open)

Runs `scripts/critic-genealogy.ts` against the committed findings on `$BRANCH`. Opus 4.7 reviews the five critic outputs and decides whether any recurring pattern is unowned by the existing council. If yes, it clones the `brand-voice-critic.json` template, swaps in the new scope, registers the spec via `POST /v1/agents`, creates a session with the vault, invokes the new critic on `$BRANCH`, and commits its findings + spec + session log to `history/$WEEK_DATE/genealogy/`. The redesigner in Step 5 then reads all findings on `$BRANCH` (including the spawned critic's) without further wiring.

**Fail-open**: if genealogy errors for any reason (API hiccup, gap-detection failure, registration 5xx), this step logs and continues. The redesigner still runs against the 5 original critic findings.

```bash
echo "=== Step 4.5: critic genealogy ==="
GENEALOGY_LOG="tmp/logs/genealogy.log"
: > "$GENEALOGY_LOG"

set +e
bun scripts/critic-genealogy.ts \
  --branch "$BRANCH" \
  --week "$WEEK_DATE" \
  --lp-target "$LP_TARGET" \
  2>&1 | tee "$GENEALOGY_LOG"
GENEALOGY_CODE=${PIPESTATUS[0]}
set -e

if (( GENEALOGY_CODE == 0 )); then
  if grep -q "no gap detected" "$GENEALOGY_LOG"; then
    GENEALOGY_STATUS="no gap — council coverage complete"
    echo "✓ $GENEALOGY_STATUS"
  elif grep -q "genealogy complete" "$GENEALOGY_LOG"; then
    SPAWNED=$(grep -oE "gap found: [a-z0-9-]+" "$GENEALOGY_LOG" | head -1 | awk '{print $3}')
    GENEALOGY_STATUS="spawned ${SPAWNED:-new critic} — findings on branch, feeding redesigner"
    echo "✓ $GENEALOGY_STATUS"
  else
    GENEALOGY_STATUS="returned 0 but output unclear — see tmp/logs/genealogy.log"
    echo "⚠ $GENEALOGY_STATUS"
  fi
else
  GENEALOGY_STATUS="failed (exit $GENEALOGY_CODE, non-blocking) — see tmp/logs/genealogy.log"
  echo "⚠ $GENEALOGY_STATUS"
fi

# If a critic was spawned, it committed findings to $BRANCH via GitHub MCP.
# Refresh our working tree so subsequent local echoes reflect the freshest state.
# (The redesigner itself re-fetches via MCP; this reset is for our own visibility.)
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
```

## Step 5 — Redesigner session (5–10 min)

Single synthesis call. Reads all findings on `$BRANCH`, commits `history/$WEEK_DATE/proposal.md` + `decision.json` to the same branch.

```bash
MSG_REDESIGNER="BRANCH=$BRANCH
WEEK_DATE=$WEEK_DATE"

run_agent_session redesigner "$REDESIGNER_ID" "$MSG_REDESIGNER"
REDESIGNER_RESULT=$?

if (( REDESIGNER_RESULT != 0 )); then
  echo "WARNING: redesigner did not complete cleanly (exit $REDESIGNER_RESULT)."
  echo "Findings are still committed on $BRANCH — you can run the redesigner manually later."
fi

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

PROPOSAL="history/$WEEK_DATE/proposal.md"
DECISION="history/$WEEK_DATE/decision.json"
if [[ -f "$PROPOSAL" && -f "$DECISION" ]]; then
  echo "✓ Redesigner output:"
  echo "    $PROPOSAL"
  echo "    $DECISION"
else
  echo "WARNING: redesigner output missing on $BRANCH."
  echo "  proposal.md: $([[ -f "$PROPOSAL" ]] && echo present || echo MISSING)"
  echo "  decision.json: $([[ -f "$DECISION" ]] && echo present || echo MISSING)"
fi
```

## Step 6 — Open draft PR (1 min)

````bash
if gh pr view "$BRANCH" --json number 2>/dev/null | jq -e '.number' >/dev/null; then
  PR_URL=$(gh pr view "$BRANCH" --json url --jq '.url')
  echo "PR already exists for $BRANCH: $PR_URL"
else
  PR_BODY=$(cat <<EOF
## Council run — week $WEEK_DATE

Automated fan-out: monitor + 5 critics + redesigner. Findings committed to this branch, synthesized into a weekly redesign proposal.

## Findings

$(printf -- '- %s\n' "${SUCCEEDED[@]}")

## Critic Genealogy

${GENEALOGY_STATUS:-not run}

## Redesigner output

- \`$PROPOSAL\`
- \`$DECISION\`

$([[ -f "$DECISION" ]] && echo "## Decision summary" && echo "" && echo '```json' && cat "$DECISION" && echo '```')

---

Opened automatically by the Webster dispatcher. Merge when ready.
EOF
)
  PR_URL=$(gh pr create --draft \
    --base main --head "$BRANCH" \
    --title "council: week $WEEK_DATE proposal" \
    --body "$PR_BODY" --json url --jq '.url' 2>/dev/null \
    || gh pr create --draft \
         --base main --head "$BRANCH" \
         --title "council: week $WEEK_DATE proposal" \
         --body "$PR_BODY" | tail -1)
fi
echo "PR: $PR_URL"
````

## Step 7 — Checkpoint + exit

```bash
CKPT=".claude/checkpoints/$(date -u +%Y-%m-%dT%H%M%SZ)-session-2-complete.md"
mkdir -p .claude/checkpoints
cat > "$CKPT" <<EOF
---
ts: $(date -u +%Y-%m-%dT%H:%M:%SZ)
trigger: session-2-complete
---

## What happened

Full council fan-out for week $WEEK_DATE. Ran monitor + 5 critics in parallel, then redesigner. All artifacts committed to \`$BRANCH\`. Draft PR opened.

## Results

- Findings with content: ${#SUCCEEDED[@]}/${#FILES[@]}
- Critic Genealogy: ${GENEALOGY_STATUS:-not run}
- Redesigner completed: $([[ $REDESIGNER_RESULT -eq 0 ]] && echo yes || echo "no (exit $REDESIGNER_RESULT)")
- PR: $PR_URL
- Mock history seeded: $($SEED_NEEDED && echo "yes (10 weeks + current)" || echo "no (already present)")

## Live state

- Branch: $BRANCH
- proposal.md: $([[ -f "$PROPOSAL" ]] && echo committed || echo MISSING)
- decision.json: $([[ -f "$DECISION" ]] && echo committed || echo MISSING)

## Next tick

$( (( ${#STUBBED[@]} > 0 )) && echo "- Re-run the stubbed critics manually and amend the PR:" && printf '  - %s\n' "${STUBBED[@]}" )
- Fork certified.richerhealth.ca into \`site/\` so the next council can produce a real diff instead of a brief.
- Record the demo video showing: fan-out → genealogy → synthesis → PR.
EOF

git add "$CKPT"
git commit -m "docs(checkpoint): session 2 complete — council week $WEEK_DATE"
git push origin main

echo ""
echo "══════════════════════════════════════════════════"
echo "Session 2 complete."
echo "  PR: $PR_URL"
echo "  Checkpoint: $CKPT"
echo "══════════════════════════════════════════════════"
exit 0
```

## If a step fails

- **Pre-flight abort**: fix the named prerequisite, re-run the whole prompt. The prompt is idempotent.
- **One critic times out (Step 3)**: re-run only that critic with `run_agent_session <label> <id> <msg>` after the fan-out completes. Then re-run Step 4 onward.
- **Genealogy errors (Step 4.5)**: non-blocking by design. `GENEALOGY_STATUS` captures the failure mode; the pipeline proceeds to the redesigner. To retry standalone after the session: `bun scripts/critic-genealogy.ts --branch "$BRANCH" --week "$WEEK_DATE" --lp-target "$LP_TARGET"`.
- **Redesigner fails (Step 5)**: findings are already on `$BRANCH`. Re-run just Step 5. PR can still be opened in Step 6 with the findings alone (redesigner output becomes MISSING in the body).
- **Context budget tight** (autocompact at 20%): this prompt is designed to run in one pass; checkpoint-before-compact is your safety net. The dispatcher will autocheckpoint, then this prompt can be re-run.
- **Anthropic API 5xx on session create**: retry the single curl. Do not re-run steps 1-2.

## What this prompt DOES NOT do

- **Does not fork `site/`.** Without `site/`, the redesigner produces a brief (`proposal.md`) instead of a diff (`proposal.diff`). That is by design for this session — `site/` fork belongs in its own focused session (see `context/SITE-FORK-CHECKLIST.md`).
- **Does not merge the PR.** The PR is opened as a draft. Human review = approval.
