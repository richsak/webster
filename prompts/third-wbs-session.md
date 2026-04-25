# Third wbs session — operator review: decide & record

> **Override default Operating Loop.** This is a review session. Do NOT scan `FEATURES.md`, do NOT launch feature workflows, do NOT create Anthropic managed-agent sessions. Execute the steps below end-to-end.

## What this session does

Closes the loop on the most recent council PR. The second session produced a draft PR; this session is the operator decision gate.

1. Finds the oldest open draft PR on a `council/<date>` branch.
2. Pulls the branch and verifies `proposal.md` + `decision.json` (+ any genealogy spawn).
3. Opus 4.7 (you, in this session) reads the artifacts and presents an operator-facing review — summary, strengths, risks, three scored options.
4. **Pauses** for the operator's decision: `merge` / `reject` / `defer` + a 1-sentence rationale.
5. Writes `history/$WEEK_DATE/operator-decision.json` — the durable record that feeds next week's monitor ("last week's proposal was rejected for X — consider Y").
6. Executes the decision: squash-merge, close-with-comment, or comment-and-leave-open.
7. Writes a completion checkpoint.

**Expected runtime:** 3–8 min wall-clock (artifact fetch + review synthesis + operator reply + merge).
**Expected API cost:** ~$0 beyond this Opus session (subscription). No managed-agent calls.

## Pre-flight (MANDATORY — do not skip)

```bash
# 1. gh CLI auth — needed to list PR, read it, merge or close it.
if ! gh auth status >/dev/null 2>&1; then
  echo "ABORT: gh CLI not authenticated."
  echo "Fix: run 'gh auth login' outside wbs, then retry this prompt."
  exit 1
fi

# 2. Working tree clean — we'll switch branches and commit on main.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ABORT: working tree has uncommitted changes."
  echo "Fix: commit or stash, then retry."
  git status --short
  exit 1
fi

# 3. This session does NOT need ANTHROPIC_API_KEY — it makes no managed-agent calls.
#    If the key is exported it won't hurt, but it's also not required.

mkdir -p tmp .claude/checkpoints
```

## Step 1 — Locate the council PR (30s)

Pick the oldest open draft PR whose branch starts `council/`. Oldest = if multiple weeks accumulated unreviewed, we review them in order.

```bash
PR_JSON=$(gh pr list --state open --draft \
  --json number,headRefName,url,createdAt --limit 50 \
  | jq 'map(select(.headRefName | startswith("council/"))) | sort_by(.createdAt) | .[0] // empty')

if [[ -z "$PR_JSON" ]]; then
  echo "ABORT: no open draft PR on a council/ branch found."
  echo "Either (a) a prior third-session already closed the loop, or"
  echo "       (b) session 2 has not been run for the current week yet."
  exit 1
fi

PR_NUM=$(echo "$PR_JSON" | jq -r '.number')
BRANCH=$(echo "$PR_JSON" | jq -r '.headRefName')
PR_URL=$(echo "$PR_JSON" | jq -r '.url')
WEEK_DATE=${BRANCH#council/}

echo "Reviewing PR #$PR_NUM — $PR_URL"
echo "Branch: $BRANCH   Week: $WEEK_DATE"
```

## Step 2 — Fetch branch + verify artifacts (1 min)

```bash
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

PROPOSAL="history/$WEEK_DATE/proposal.md"
DECISION="history/$WEEK_DATE/decision.json"
GENEALOGY_DIR="history/$WEEK_DATE/genealogy"
OPERATOR_DECISION="history/$WEEK_DATE/operator-decision.json"

echo "── Artifact presence ─────────────────────────"
[[ -f "$PROPOSAL" ]] && echo "  ✓ $PROPOSAL ($(wc -l < "$PROPOSAL") lines)" \
                    || echo "  ✗ $PROPOSAL MISSING"
[[ -f "$DECISION" ]] && echo "  ✓ $DECISION" \
                    || echo "  ✗ $DECISION MISSING"
[[ -d "$GENEALOGY_DIR" ]] && echo "  + genealogy spawn: $(ls "$GENEALOGY_DIR" | tr '\n' ' ')" \
                         || echo "    (no genealogy spawn this week)"

# Guard: proposal missing = redesigner failed; cannot meaningfully review.
if [[ ! -f "$PROPOSAL" ]]; then
  echo "ABORT: $PROPOSAL missing on $BRANCH. Redesigner output absent — nothing to review."
  echo "Fix: re-run Step 5 of second-wbs-session.md, then retry this prompt."
  exit 1
fi

# Guard: loop already closed for this week.
if [[ -f "$OPERATOR_DECISION" ]]; then
  echo "NOTE: $OPERATOR_DECISION already exists:"
  cat "$OPERATOR_DECISION"
  echo "The PR is still open-draft but the decision was already recorded."
  echo "If you want to re-decide, delete that file on $BRANCH and re-run."
  exit 0
fi
```

## Step 3 — Opus review + present options

**You (Opus 4.7) now read the artifacts and produce the review below, then STOP and wait for the operator's reply.**

Tool calls for this step:

- `Read` `$PROPOSAL` — the redesigner's full proposal.
- `Read` `$DECISION` — the redesigner's structured picks (primary + alt + rejected).
- If `$GENEALOGY_DIR` exists: `Read` the first `*.md` findings file inside it to see what the spawned critic added.
- Do NOT re-read individual critic findings — the proposal already synthesizes them. Keep context tight.

Produce in chat, using this exact structure (operator is Richie — lead with scores per his communication preference):

```markdown
### Summary

[2–3 sentences: what the proposal changes and why, in plain language.]

### Strengths (top 1–2)

- [Specific, not generic. "Hero headline swaps passive voice for outcome framing
  — directly addresses conversion critic's #1 finding" not "good copy work".]

### Risks (top 1–2)

- [Specific failure mode. "H1 change breaks SEO tracking on 'homepage' event
  unless the analytics tag is updated" not "could affect SEO".]

### Genealogy

[One line: no spawn | spawned <name> — <what gap it covered>]

### Options

1. **Merge** (X/100) — [one-line why]
2. **Reject** (X/100) — [one-line why]
3. **Defer** (X/100) — [one-line why]

---

**Decide**: reply `merge`, `reject`, or `defer` — plus a 1-sentence rationale.
```

**HARD STOP.** Do not execute Steps 4–7 until the operator replies with a decision.

## Step 4 — Record the decision

When the operator replies, parse their choice (`merge` | `reject` | `defer`) and rationale. Set these as bash vars at the top of Step 5:

```bash
# Fill these in from the operator's reply.
DECISION_CHOICE="merge"         # merge | reject | defer
DECISION_RATIONALE="<one-sentence rationale from operator's reply>"

# Validate.
case "$DECISION_CHOICE" in
  merge|reject|defer) ;;
  *) echo "ERROR: DECISION_CHOICE must be merge|reject|defer, got '$DECISION_CHOICE'"; exit 1 ;;
esac
```

## Step 5 — Execute the decision

All three paths end on `main` with `history/$WEEK_DATE/operator-decision.json` committed. Merge adds a `merge_sha`; reject closes the PR; defer leaves it open with a comment.

```bash
case "$DECISION_CHOICE" in
  merge)
    # Squash-merge with rationale as merge-commit body.
    gh pr merge "$PR_NUM" --squash --delete-branch \
      --body "$DECISION_RATIONALE"

    # Grab the squash commit SHA for the record.
    MERGE_SHA=$(gh pr view "$PR_NUM" --json mergeCommit --jq '.mergeCommit.oid' 2>/dev/null)
    [[ -z "$MERGE_SHA" || "$MERGE_SHA" == "null" ]] && MERGE_SHA="unknown"

    git checkout main
    git pull origin main

    jq -n \
      --arg d "$DECISION_CHOICE" \
      --arg r "$DECISION_RATIONALE" \
      --arg pr "$PR_URL" \
      --arg sha "$MERGE_SHA" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{decision: $d, rationale: $r, pr_url: $pr, merge_sha: $sha, timestamp: $ts}' \
      > "$OPERATOR_DECISION"

    git add "$OPERATOR_DECISION"
    git commit -m "docs(council): operator approved $BRANCH — $DECISION_RATIONALE"
    git push origin main
    RESULT="merged (sha=$MERGE_SHA, branch deleted)"
    ;;

  reject)
    gh pr close "$PR_NUM" --comment "Rejected: $DECISION_RATIONALE"

    git checkout main
    git pull origin main
    mkdir -p "history/$WEEK_DATE"

    jq -n \
      --arg d "$DECISION_CHOICE" \
      --arg r "$DECISION_RATIONALE" \
      --arg pr "$PR_URL" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{decision: $d, rationale: $r, pr_url: $pr, timestamp: $ts}' \
      > "$OPERATOR_DECISION"

    git add "$OPERATOR_DECISION"
    git commit -m "docs(council): operator rejected $BRANCH — $DECISION_RATIONALE"
    git push origin main
    RESULT="rejected (PR closed, branch kept for history)"
    ;;

  defer)
    gh pr comment "$PR_NUM" --body "Deferred: $DECISION_RATIONALE"

    git checkout main
    git pull origin main
    mkdir -p "history/$WEEK_DATE"

    jq -n \
      --arg d "$DECISION_CHOICE" \
      --arg r "$DECISION_RATIONALE" \
      --arg pr "$PR_URL" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{decision: $d, rationale: $r, pr_url: $pr, timestamp: $ts}' \
      > "$OPERATOR_DECISION"

    git add "$OPERATOR_DECISION"
    git commit -m "docs(council): operator deferred $BRANCH — $DECISION_RATIONALE"
    git push origin main
    RESULT="deferred (PR still open)"
    ;;
esac

echo ""
echo "── Decision executed ────────────────────────"
echo "  Choice: $DECISION_CHOICE"
echo "  Result: $RESULT"
echo "  Record: $OPERATOR_DECISION"
```

## Step 6 — Checkpoint + exit

```bash
CKPT=".claude/checkpoints/$(date -u +%Y-%m-%dT%H%M%SZ)-session-3-complete.md"
cat > "$CKPT" <<EOF
---
ts: $(date -u +%Y-%m-%dT%H:%M:%SZ)
trigger: session-3-complete
---

## What happened

Operator review of council week $WEEK_DATE PR. Decision: **$DECISION_CHOICE**. Result: $RESULT.

## Artifacts

- PR: $PR_URL
- Decision record: $OPERATOR_DECISION
- Rationale: $DECISION_RATIONALE

## Next tick

- Next council run: week ending $(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc) + timedelta(days=7)).strftime('%Y-%m-%d'))
PY
).
- Next week's monitor should pick up \`$OPERATOR_DECISION\` and factor the rationale
  into its WoW anomaly framing (e.g., if rejected, the previous week's proposed
  change did not ship — baseline is unchanged).
EOF

git add "$CKPT"
git commit -m "docs(checkpoint): session 3 complete — $DECISION_CHOICE week $WEEK_DATE"
git push origin main

echo ""
echo "══════════════════════════════════════════════════"
echo "Session 3 complete."
echo "  PR #$PR_NUM — $DECISION_CHOICE"
echo "  Record: $OPERATOR_DECISION"
echo "  Checkpoint: $CKPT"
echo "══════════════════════════════════════════════════"
exit 0
```

## If a step fails

- **No open `council/` draft PR**: second-session hasn't run this week, or a prior third-session already closed the loop. Run `prompts/second-wbs-session.md` first.
- **`proposal.md` missing on branch**: the redesigner didn't finish. Re-run Step 5 of the second session (`run_agent_session redesigner "$REDESIGNER_ID" "$MSG_REDESIGNER"` against the same branch), then retry this prompt.
- **`operator-decision.json` already exists**: the loop is already closed for this week. Either (a) accept and exit, or (b) delete the file on `$BRANCH`, push, retry.
- **`gh pr merge` rejected (CI red, protected branch, conflicts)**: the PR has a blocker. Fix the blocker on `$BRANCH` and re-push, then re-run this prompt from Step 1.
- **Operator replies with something other than `merge|reject|defer`**: Step 4 validation aborts cleanly. Re-run the prompt and reply with a valid choice.

## What this prompt DOES NOT do

- **Does not re-run any critic.** Findings are frozen at PR-open time. If a critic was wrong, either reject-and-retry next week, or defer and re-run session 2 after fixing the agent.
- **Does not touch `site/`.** This repo is still brief-only — no forked landing page to diff. When `site/` exists, the merge path will also land the diff; no change to this prompt required.
- **Does not update `FEATURES.md` or run `bun run validate`.** This is a review prompt, not a feature prompt. The only code path it commits is the JSON record + checkpoint.
