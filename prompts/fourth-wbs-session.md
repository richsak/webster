# Fourth wbs session — deploy old/new LP + grill-me on v2

> **Override default Operating Loop.** This is a polish + planning session. Do NOT scan `FEATURES.md` for the normal dispatch loop, do NOT launch feature workflows, do NOT create Anthropic managed-agent sessions. Execute the phases below end-to-end.

## What this session does

Two goals, sequenced so Phase 1 (deploy) runs first — Richie can eyeball the old/new UI in his browser while Phase 2 (grill-me) is active.

1. **Phase 1 — Fork + manual apply + local preview (~45 min).** Mirror `certified.richerhealth.ca` into `site/before/`, clone to `site/after/`, manually apply the 5 `history/2026-04-23/proposal.md` edits, start a local http server, output two URLs.
2. **Phase 2 — Grill-me on v2 (~30 min).** Invoke the `grill-me` skill on the top-5 planning questions for feature #39 (apply + review/fix loop). Output: `context/v2-design.md`.
3. **Phase 3 — Translate decisions.** Update `FEATURES.md` Layer 8 with concrete sub-features derived from the grill-me outcome.
4. **Phase 4 — Checkpoint.**

**Expected runtime:** 75–90 min wall-clock (Phase 1 ~45, Phase 2 ~30, Phase 3–4 ~10).
**Expected API cost:** ~$0 (Opus subscription; no managed-agent calls).

## Pre-flight (MANDATORY — do not skip)

```bash
# 1. Working tree clean — we'll be creating files under site/
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ABORT: working tree has uncommitted changes."
  git status --short
  exit 1
fi

# 2. Tools required
for tool in wget python3 jq gh git; do
  command -v "$tool" >/dev/null 2>&1 || { echo "ABORT: $tool not installed"; exit 1; }
done

# 3. Operator-decision.json for last week exists (confirms session 3 ran)
[[ -f history/2026-04-23/operator-decision.json ]] || {
  echo "ABORT: history/2026-04-23/operator-decision.json missing."
  echo "Run prompts/third-wbs-session.md first."
  exit 1
}

# 4. site/ should NOT already exist (this session creates it); bail if it does
if [[ -d site/before || -d site/after ]]; then
  echo "NOTE: site/before or site/after already exists."
  echo "If this is a re-run, delete them first:  rm -rf site/"
  exit 1
fi

mkdir -p site tmp .claude/checkpoints
```

## Phase 1 — Fork + manual apply + preview server

### Step 1.1 — Mirror live LP into `site/before/` (~5 min)

```bash
cd site
wget \
  --mirror \
  --convert-links \
  --adjust-extension \
  --page-requisites \
  --no-parent \
  --span-hosts \
  --domains=certified.richerhealth.ca,richerhealth.ca \
  --user-agent="Mozilla/5.0 (webster-fork)" \
  -e robots=off \
  -o ../tmp/wget-before.log \
  https://certified.richerhealth.ca/ || {
    echo "wget hit errors — inspect tmp/wget-before.log"
  }

# wget nests everything under certified.richerhealth.ca/; flatten into before/
mv certified.richerhealth.ca before
[[ -d richerhealth.ca ]] && mv richerhealth.ca before/_external-richerhealth.ca

cd ..

# Sanity check: must have an index.html
[[ -f site/before/index.html ]] || {
  echo "ABORT: wget did not produce site/before/index.html"
  ls -la site/before/
  exit 1
}

echo "── site/before rendered OK ──"
du -sh site/before
ls site/before/ | head -20
```

### Step 1.2 — Clone `before` → `after` (<1 min)

```bash
cp -R site/before site/after
[[ -f site/after/index.html ]] || { echo "ABORT: copy failed"; exit 1; }
echo "── site/after ready for edits ──"
```

### Step 1.3 — Apply the 5 proposal.md edits to `site/after/` (~30 min)

**You (Opus 4.7) now perform the edits directly, using the `Read`/`Edit` tools against `site/after/index.html` (and any linked HTML files wget produced). Edit sources: `history/2026-04-23/proposal.md` Issues 1–5.**

Apply order (surgical, one at a time, verify after each):

1. **Issue 1 — CTA → Acuity.** Find every `<a … href="#"` that is a BOOK/CALL CTA. Replace `href="#"` with `href="https://app.acuityscheduling.com/schedule.php?owner=16697295"`, add `target="_blank"`, `rel="noopener"`, `data-cta="book-strategy-call"`. Standardise visible label to `BOOK YOUR FREE STRATEGY CALL`. **Expected count: 5 CTAs.** If you find more or fewer, stop and report — the live LP may have changed since the critics last read it.

2. **Issue 2 — DSocSci + medical disclaimer.** In `site/after/index.html` find `FOUNDER & MASTER CLINICIAN` (or the `&amp;` variant) → replace with `FOUNDER, RICHER HEALTH`. Find `Dr. Nicolette Richer` in the founder section → replace with `Dr. Nicolette Richer, DSocSci`. Append the scope-note `<p>` block from proposal.md Issue 2 Change A immediately after the founder name. In footer, prepend the medical-disclaimer `<p>` from Issue 2 Change B. Replace footer `href="#"` links with `/privacy`, `/terms`, `/clinical-standards`, `mailto:hello@richerhealth.ca`.

3. **Issue 3 — Hedge clinical-authority language.** Three replacements:
   - `25 years reversing chronic disease…` → hedged version from Issue 3 Change A
   - `Patients Treated` → `Clients Served`
   - `Trained under Charlotte Gerson…` → first-person hedged version from Issue 3 Change C

4. **Issue 4 — Hero H1 + subhead.** Find current H1 `YOUR PRACTICE. THEIR PLAYBOOK. PATIENTS NOTICE.` → replace with the N&D-keyword-bearing H1 from Issue 4. Replace the existing subhead `<p>` with the ICP-framed subhead.

5. **Issue 5 — Head tag foundation.** In `<head>` of `site/after/index.html`: rewrite `<title>`, add meta description, canonical, OG tags, Twitter tags, JSON-LD block. Full HTML is in proposal.md Issue 5.

   **Dependency**: `og-card.jpg` doesn't exist yet. For this session's preview, set `og:image` / `twitter:image` to a placeholder comment `<!-- og-card.jpg TBD -->` INSTEAD of including the broken URL. Do NOT ship broken image URLs in the meta.

After each issue, run a smoke check:

```bash
# Count the change to confirm it landed
grep -c "app.acuityscheduling.com" site/after/index.html   # expect ≥5 after Issue 1
grep -c "DSocSci" site/after/index.html                     # expect ≥2 after Issue 2
grep -c "Clients Served" site/after/index.html              # expect 1 after Issue 3
grep -c "N&amp;D Team Certification" site/after/index.html  # expect ≥1 after Issue 4
grep -c "application/ld+json" site/after/index.html         # expect 1 after Issue 5
```

If any count is 0, stop and diagnose — the rendered HTML may use different markup than proposal.md assumed.

### Step 1.4 — Start preview server (background) (<1 min)

```bash
# Kill any previous server on 8080
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Start server in background, pinned to repo root so both before/ and after/ serve
nohup python3 -m http.server 8080 > tmp/http-server.log 2>&1 &
disown
sleep 1

# Verify
curl -sf http://localhost:8080/site/before/ >/dev/null && echo "  ✓ before reachable" \
  || echo "  ✗ before NOT reachable — check tmp/http-server.log"
curl -sf http://localhost:8080/site/after/ >/dev/null && echo "  ✓ after reachable" \
  || echo "  ✗ after NOT reachable"

echo ""
echo "══════════════════════════════════════════════════"
echo "Open in browser:"
echo "  BEFORE: http://localhost:8080/site/before/"
echo "  AFTER:  http://localhost:8080/site/after/"
echo "══════════════════════════════════════════════════"
```

### Step 1.5 — Commit the fork + apply (optional; gate on Richie visual approval)

**PAUSE.** Richie eyeballs both URLs. If anything is visibly broken (layout collapse, missing CSS, wrong content), fix before committing.

Once Richie confirms visual parity and the `after` edits look correct:

```bash
git add site/
git commit -m "feat(site): fork certified.richerhealth.ca + apply week 2026-04-23 proposal (manual apply)"
git push origin main
```

Commit ends Phase 1.

---

## Phase 2 — Grill-me on v2 features (interactive)

**Invoke the `grill-me` skill with the question tree below.** Grill-me is an interview pattern — one question at a time, pressure-test Richie's answer, move on when an answer is sharp. Keep each exchange tight (no walls of text).

### Question tree (top priority — must answer in this session)

**Q1. Apply worker runtime.**
Recommendation (75/100): Pi worker (Codex gpt-5.4) via a Forge workflow. Rationale: Pi is already Webster's worker-pool standard, Codex is good at structured code mutation, Forge gives us worktree isolation + validation. Alternatives: a Claude Opus managed agent (expensive, unnecessary), `claude -p` subscription (subscription burn, no isolation). Grill-me: press on why NOT Forge+Pi; surface concrete blockers.

**Q2. Done-definition.**
Recommendation (70/100): "Lint+type green" as a hard floor, PLUS re-running the 5 (or 6 with visual-design) council critics against the mutated code and requiring zero new CRITICAL/HIGH findings. Rationale: "green build" is necessary but not sufficient; re-running critics is the system's own quality signal. Alternatives: purely green-build (lower bar), add visual-regression snapshot (stronger but needs a Playwright infra layer). Grill-me: is visual-regression worth the infra cost, or overkill for weekly cadence?

**Q3. Image generation tool.**
Recommendation (80/100): **Yes, scoped to known asset classes** — apply worker gets a `generate_visual_asset(type, brand_context, dims, prompt)` tool where type ∈ `{og_card, icon, hero_bg, section_illustration}`. Backend: OpenAI `gpt-image-1` (highest quality/cost ratio for small-format assets). Rationale: week 1 proposal already identified one real need (og-card.jpg); without this tool, apply worker either ships broken image URLs or blocks on client assets. Scoping to enumerated types prevents scope creep to "generate any image." Alternatives: no image gen (apply worker stubs placeholders, operator fills later — simpler but incomplete deliverable), Stitch MCP (good for UI mockups, not loose assets like OG cards). Grill-me: is enumerated-type scoping too restrictive? What's the first asset class beyond the four listed that we'd need?

**Q4. PR-format: one big PR vs. one per issue.**
Recommendation (65/100): **One PR per issue** (or per issue-cluster if two issues touch the same file — e.g. Issues 2 + 3 both edit `FounderSection.astro`). Rationale: smaller PRs = easier review, partial-merge-ability (operator can merge Issue 1 and reject Issue 5 independently), clearer Git history. Tradeoff: more PR overhead (5x branches, 5x CI runs). Alternatives: one big PR (simpler automation, all-or-nothing merge). Grill-me: at what issue-count does "one per issue" become too noisy? (2? 5? 10?)

**Q5. Failure fallback when apply can't land an issue.**
Recommendation (70/100): **Skip + annotate.** If the apply worker can't apply an issue (string mismatch, layout conflict, merge impossible), skip that issue, log a structured annotation to `history/<week>/apply-log.json`, and continue. Do NOT fail the whole run on one skipped issue. Operator review sees the annotation and decides next steps. Rationale: partial progress > blocked-entirely. Alternatives: fail-fast (blocks other fixes for no reason), auto-escalate to Opus-4.7 human-in-loop (expensive, negates autonomy claim). Grill-me: should a CRITICAL-severity skipped issue block the PR from opening at all?

### Deferred to a later grill-me (ack but don't resolve this session)

- Visual-design-critic: standing vs. spawn-each-week
- Multi-site vs. single-site from day 1
- Trigger cadence (every merge vs. on-demand vs. weekly)
- Review step composition (new code-reviewer agent vs. re-run critics)
- Iteration cap (how many review/fix loops before bail)

### Output format

Grill-me writes answers to `context/v2-design.md` as it goes:

```markdown
# Webster v2 — Apply + Review/Fix Loop (design doc)

> Captured from the Phase 2 grill-me session on 2026-04-23.
> Feature entry: `FEATURES.md` #39.

## Q1 — Apply worker runtime

**Decision:** <Richie's answer>
**Rationale:** <one line>
**Open sub-questions:** <list if any>

## Q2 — Done-definition

…
```

---

## Phase 3 — Translate decisions into FEATURES.md

Once Phase 2 concludes, translate the 5 Q&A outcomes into concrete Layer 8 sub-features. Replace the single "#39 NEEDS PLANNING" row with a decomposition like:

- #39a — Apply worker implementation (Pi Codex via Forge workflow)
- #39b — Critic re-run gate + done-definition wiring
- #39c — Image-gen tool (`generate_visual_asset`) — enumerated asset classes
- #39d — Per-issue PR emission + apply-log.json annotation
- #39e — Skip+annotate fallback behaviour

Assign `todo` status to each. Leave hours as estimate-after-grill-me.

```bash
# After editing FEATURES.md:
git add context/FEATURES.md context/v2-design.md
git commit -m "docs(v2): grill-me design doc + decomposed #39 sub-features"
git push origin main
```

---

## Phase 4 — Checkpoint + exit

```bash
CKPT=".claude/checkpoints/$(date -u +%Y-%m-%dT%H%M%SZ)-session-4-complete.md"
cat > "$CKPT" <<EOF
---
ts: $(date -u +%Y-%m-%dT%H:%M:%SZ)
trigger: session-4-complete
---

## What happened

Session 4: forked certified.richerhealth.ca into site/before + site/after,
manually applied week 2026-04-23 proposal to after, stood up local preview,
grilled v2 apply+loop design in Phase 2, decomposed FEATURES.md #39.

## Preview URLs (local only — kill http-server when done)

- BEFORE: http://localhost:8080/site/before/
- AFTER:  http://localhost:8080/site/after/

## v2 decisions (see context/v2-design.md)

- Q1 worker runtime: <filled in>
- Q2 done-definition: <filled in>
- Q3 image-gen tool: <filled in>
- Q4 PR format: <filled in>
- Q5 failure fallback: <filled in>

## Next tick

- Kill local http-server when done:  lsof -ti:8080 | xargs kill -9
- Remaining submission-critical work:
  - Cerebral Valley submission form (#37, Richie action)
  - Demo video (Layer 6 — Richie voice record blocker)
  - Bug fixes from session 2/3 (5 known)
- Post-submission: build #39a–e per the decomposition.
EOF
echo "Checkpoint: $CKPT"
```

Checkpoints are gitignored by policy — do NOT git-add this file.

```bash
echo ""
echo "══════════════════════════════════════════════════"
echo "Session 4 complete."
echo "  Site fork + apply:  site/before, site/after (committed)"
echo "  v2 design doc:      context/v2-design.md (committed)"
echo "  FEATURES Layer 8:   decomposed into #39a–e (committed)"
echo "  Local preview:      http://localhost:8080/site/{before,after}/"
echo "  Checkpoint:         $CKPT"
echo "══════════════════════════════════════════════════"
echo ""
echo "Kill the preview server when done:  lsof -ti:8080 | xargs kill -9"
exit 0
```

## If a step fails

- **wget mirror incomplete / broken CSS in before/**: some LPs use CDN URLs that don't rewrite cleanly. Fallback: `curl -o site/before/index.html https://certified.richerhealth.ca/`, open in browser, accept that external CSS may break — the demo still shows the content structure even if styling is off.
- **Apply edit: string not found**: the live LP may have changed since the critics last read it (24h+ old findings). Report the mismatch, ask Richie whether to force-apply via near-match or skip. Do NOT silently alter the edit.
- **http.server port conflict**: change `8080` to `8081` throughout.
- **Grill-me stalls on a question**: document the stall as an open sub-question, move to next Q. Don't force resolution on a question that's genuinely unresolved — pencil it in for the next grill-me.

## What this prompt does NOT do

- **Does not build the apply worker**. Phase 2 is planning, not implementation. Apply worker construction is a separate session after v2-design.md is signed off.
- **Does not deploy to a public URL**. Preview is local-only. If Richie wants a public URL for the demo video, pipe `site/before/` + `site/after/` into a second session that wires Cloudflare Pages or `vercel --prod`.
- **Does not modify existing council infrastructure**. The critic/redesigner/genealogy pipeline is frozen for submission.
