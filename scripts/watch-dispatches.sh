#!/bin/bash
# Watcher for webster-ralph-dag dispatches.
# Polls each dispatch log for `dag_workflow_finished`, then invokes the dispatcher
# via `claude -p` with a trigger message so it can pick up FEATURES.md updates
# and fire the next batch.
#
# Usage:
#   scripts/watch-dispatches.sh                       # uses default v5 slugs
#   scripts/watch-dispatches.sh slug1 slug2 slug3 ... # explicit slugs to watch
#
# Each explicit slug is treated as both the feature-# (unknown; reports as "?")
# and the branch (feat/<slug>). Default mode hard-codes the v5 metadata.
#
# Runs forever until all watched dispatches report `dag_workflow_finished`.
# Backgrounded via nohup by the dispatcher. Safe to run multiple watchers for
# disjoint slug sets; the lockfile is keyed by slug-set hash.

set -eu
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBSTER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DISPATCHER_SETTINGS="$WEBSTER_ROOT/.claude/dispatcher-settings.json"
DISPATCHER_PROMPT="$WEBSTER_ROOT/.claude/dispatcher.md"
LOG_DIR="$WEBSTER_ROOT/tmp/logs"
WATCHER_LOG_DIR="$WEBSTER_ROOT/tmp/watcher"
POLL_SECONDS=30

mkdir -p "$WATCHER_LOG_DIR"

# Dispatch table format: slug|feature|branch, one per line.
if [ "$#" -gt 0 ]; then
  DISPATCHES=""
  for slug in "$@"; do
    DISPATCHES="${DISPATCHES}${slug}|?|feat/${slug}\n"
  done
  DISPATCHES=$(printf "%b" "$DISPATCHES")
else
  DISPATCHES="planner-agent-spec-v5|#50|feat/planner-agent-spec-v5
apply-worker-cli-v5|#39a|feat/apply-worker-cli-v5
seed-demo-arc-w3w4-v5|#57|feat/seed-demo-arc-w3w4-v5"
fi

SLUG_HASH=$(printf "%s" "$DISPATCHES" | shasum | cut -c1-8)
LOCKFILE="$WATCHER_LOG_DIR/watcher-${SLUG_HASH}.lock"
COMPLETED_FILE="$WATCHER_LOG_DIR/watcher-${SLUG_HASH}-completed.txt"
WATCHER_LOG="$WATCHER_LOG_DIR/watcher-${SLUG_HASH}.log"

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$WATCHER_LOG" >&2
}

cleanup() {
  rm -f "$LOCKFILE"
  log "watcher exiting, lockfile cleaned"
}
trap cleanup EXIT INT TERM

if [ -r "$LOCKFILE" ]; then
  existing_pid=$(cat "$LOCKFILE")
  if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
    echo "watcher already running for this slug set (pid=$existing_pid, lockfile=$LOCKFILE)" >&2
    exit 1
  fi
  log "stale lockfile found (pid=$existing_pid), overwriting"
fi
echo "$$" > "$LOCKFILE"

: > "$COMPLETED_FILE"
: > "$WATCHER_LOG"

log "watcher started, pid=$$, slug-hash=$SLUG_HASH"
log "watching:"
printf "%s\n" "$DISPATCHES" | while IFS='|' read -r slug feature branch; do
  log "  $slug ($feature) on $branch"
done

notify_osx() {
  local title="$1"
  local body="$2"
  osascript -e "display notification \"$body\" with title \"$title\"" 2>/dev/null || true
}

ping_dispatcher() {
  local slug="$1"
  local feature="$2"
  local branch="$3"
  local status="$4"

  local response_log
  response_log="$WATCHER_LOG_DIR/response-${slug}-$(date +%s).log"
  local msg
  msg="watcher: dispatch ${feature} on ${branch} finished (status=${status}). Pick up this completion: read .claude/checkpoints/ for prior state, inspect forge isolation list for merge state, update context/FEATURES.md row (todo→in-progress→done/blocked), and if queue has room (<=3 concurrent), dispatch the next L11 feature per the dispatcher rules. Watcher log: $WATCHER_LOG. Workflow log: $LOG_DIR/${slug}.log."

  log "pinging dispatcher for $slug (status=$status) -> $response_log"
  notify_osx "Webster dispatch: $feature" "$branch finished ($status). Spawning dispatcher."

  cd "$WEBSTER_ROOT" || return 1
  claude \
    -p "$msg" \
    --dangerously-skip-permissions \
    --model claude-opus-4-7 \
    --settings "$DISPATCHER_SETTINGS" \
    --system-prompt "$(cat "$DISPATCHER_PROMPT")" \
    > "$response_log" 2>&1 || log "WARN: claude -p exited non-zero for $slug (see $response_log)"

  log "dispatcher run completed for $slug"
  notify_osx "Webster dispatcher" "Finished pass for $feature ($branch)."
}

while true; do
  remaining=0
  while IFS='|' read -r slug feature branch; do
    [ -z "$slug" ] && continue
    logfile="$LOG_DIR/${slug}.log"

    if grep -qxF "$slug" "$COMPLETED_FILE" 2>/dev/null; then
      continue
    fi

    remaining=$((remaining + 1))

    [ -f "$logfile" ] || continue
    grep -q 'dag_workflow_finished' "$logfile" || continue

    if grep -q '"anyFailed":true' "$logfile"; then
      status="failed"
    elif grep -q '"anyCompleted":true' "$logfile"; then
      status="success"
    else
      status="unknown"
    fi

    log "detected completion: $slug status=$status"
    echo "$slug" >> "$COMPLETED_FILE"

    ping_dispatcher "$slug" "$feature" "$branch" "$status"
  done <<< "$DISPATCHES"

  if [ "$remaining" -eq 0 ]; then
    log "all ${SLUG_HASH} dispatches handled, watcher done"
    notify_osx "Webster watcher" "All dispatches complete — watcher done."
    break
  fi

  sleep "$POLL_SECONDS"
done
