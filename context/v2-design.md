# Webster v2 — Apply + Review/Fix Loop (design doc)

> Captured during session 4 Phase 2 grill-me on 2026-04-23.
> Feature entries: `FEATURES.md` #39 (apply worker), #40 (image-gen).
>
> Context: Richie executed session 4 in auto-mode. Below reflects the
> best-available decisions derived from the prompt's rec baseline + the
> live finding from today's wget mirror (critic blind-spot re
> `data-calendly-base` runtime rewrite) + advisor sanity-check.
> Items marked **[R-confirm]** would benefit from an explicit Richie pass
> before implementation kicks off.

---

## Q1 — Apply worker runtime

**Decision (80/100):** Pi worker (Codex gpt-5.4) invoked via a Forge
workflow, worktree-isolated per apply run.

**Rationale (building blocks → connections → behaviour):**

- Pi is already Webster's worker-pool standard. Adding another runtime
  class for one new worker is cost the system doesn't need.
- Codex (gpt-5.4, high reasoning) handles structured code mutation
  reliably — find-string / replace-with-tree transforms, JSON-LD
  insertion, Astro-component patching. Today's session proved this kind
  of work is doable by a reasoning model, not a stretch.
- Forge gives the two things the apply step needs that raw `claude -p`
  doesn't: (a) isolated git worktree per run, so one bad apply doesn't
  clobber another's branch; (b) a validation stage with lint+type+format
  baked in.
- The alternative of a Claude Opus managed-agent session is overkill —
  Opus' reasoning surplus isn't the bottleneck in find-replace on 5
  issues; the bottleneck is confining the transform. Codex + validation
  harness wins on $/task by an order of magnitude.

**Non-option:** Claude Opus managed-agent. `claude -p` subscription
without Forge isolation.

**Open:** none significant.

---

## Q2 — Done-definition

**Decision (72/100):** Three-part gate, all required to pass before the
apply worker opens a PR:

1. **Static floor** — lint + type + format green on the mutated source
   (mirrors existing Webster validate pipeline).
2. **Runtime check** — headless browser opens the mutated page and
   verifies CTAs resolve to real booking URLs, `<script>` blocks don't
   throw, no console errors. Directly motivated by today's critic
   blind-spot finding: static greps miss runtime-rewritten CTAs like
   `data-calendly-base` → Calendly. A headless-browser gate would have
   caught the week-1 CRITICAL misdiagnosis.
3. **Critic re-run** — spawn the same 5 critics (or 6 with visual-design)
   against the mutated code. Zero new CRITICAL findings required; HIGH
   findings permitted up to a threshold (e.g. ≤2).

**Rationale:** "green build" is necessary but not sufficient — it doesn't
catch wrong content, dead JS, or regressions in the critics' core
concerns. The runtime check is the cheapest addition that closes the
biggest known gap. Re-running critics is the self-consistency loop.

**Visual-regression snapshot:** deferred to v2 week 2+. The Playwright
infra to snapshot and diff-compare is a separate setup; week 1 ships
without it. **[R-confirm]** if visual-regression is worth building
immediately for the demo-video cut.

**Open:** HIGH-finding threshold (2? 3?). `[R-confirm]`

---

## Q3 — #39 ↔ #40 dependency strength

**Decision (78/100):** Soft dependency. #39 (apply worker) ships first
with `<!-- asset TBD: <type> -->` HTML-comment stubs where it encounters
image placeholders. #40 (image-gen tool) ships as a follow-up; the apply
worker begins calling it when available.

**Enumerated type list for #40:**

```text
{
  og_card,               // 1200×630 social-share image (week-1 need)
  hero_background,       // Full-bleed hero section backdrop
  testimonial_headshot,  // Circular 400×400 portrait for quote cards
  icon,                  // 48×48 mono/duotone line-art (step cards)
  section_illustration   // 800×600 supporting editorial image
}
```

Five is a small enough list to keep the schema tight. If the apply
worker encounters a `TBD` type that isn't in this enum, it emits a stub
comment flagging the need — this is how the enum grows intentionally
over subsequent weeks.

**Missing-from-list candidates that were considered and cut for v2 week 1:**

- `diagram_illustration` (for arch diagrams, decision trees) — niche on
  an LP; add if a future week demands it.
- `pattern_tile` (for textured backgrounds) — CSS can do this.
- `animated_gif` / `video_loop` — out of scope; different backend.

**Cost ceiling:** $2/run self-imposed (≈20 generations at gpt-image-1
rates); forces quality gates and prevents a loop from burning $$$ on
regenerations.

**Brand-context input format:** JSON blob the apply worker builds from
`context/business.md` + a palette file the onboarding skill writes:

```json
{
  "palette": ["#495A58", "#80A8A7", "#292F2E"],
  "brand_voice": "calm-authoritative; dark/sage/near-black color mood",
  "typography": "Inter headline, Source Sans Pro body",
  "restraint": "no saturated primaries, no cartoon style, no stock-photo feel"
}
```

**Asset persistence path:** `site/public/assets/generated/<week>/<type>-<slug>.<ext>`.
Gitignored cache at `.webster/generated-cache/` to dedupe identical-brief
regenerations across weeks.

**Stub-when-absent vs. complete-or-fail:** stub wins. Partial progress
beats blocked-entirely; the week-1 proposal's og-card is a good example —
the SEO meta-tags ship valuable without the image, and the image is a
separable follow-up. This session's `site/after/index.html` already
demonstrates the pattern (HTML comments where og-card.jpg would go).

**Open:** backend choice — OpenAI `gpt-image-1` vs. Stitch MCP vs.
Replicate. gpt-image-1 is the safest default (proven, widely integrated,
Anthropic-adjacent-tooling-friendly). `[R-confirm]` backend + cost
ceiling.

---

## Q4 — PR format

**Decision (70/100):** One PR per **issue-cluster**, where a cluster is
the group of issues that touch overlapping files. Minimum 1 issue per
PR, maximum 3 issues per PR. Hard ceiling: 3 PRs per weekly run.

**Rationale:**

- One-PR-per-issue was the ergonomic ideal (smaller, partial-mergeable,
  clearer history) but the tradeoff — 5× CI runs, 5× review windows, 5×
  merge conflicts when two issues touch the same file — is prohibitive
  in a weekly cadence with non-technical operators reviewing on phone.
- One-PR-for-everything gives zero partial-merge-ability; operator must
  accept all-or-nothing, and that's where good proposals die.
- Cluster-based is the mid-point: related issues (e.g. Issues 2 + 3 from
  today's proposal both touch the founder section) ship together, so
  reviewers see a coherent semantic change; unrelated issues (e.g.
  Issue 5 head-tag vs. Issue 1 CTA wiring) stay separate.

**Clustering heuristic for the apply worker:**

1. Build a `{issue → touched_files}` map after dry-run parse.
2. Union-find on shared files; each connected component is a cluster.
3. If any cluster exceeds 3 issues, split heuristically by severity
   (CRITICALs first cluster, rest second).

**Noise threshold Richie asked about:** in practice ≤3 PRs/week is
comfortable; ≥5 PRs/week starts eroding review quality. Hard ceiling of
3 matches this.

**Open:** PR description format — is there a machine-readable `summary.json`
alongside markdown? `[R-confirm]`

---

## Q5 — Failure fallback when apply can't land an issue

**Decision (75/100):** Skip + annotate, with a severity-tiered response.

**Per-issue handling:**

- **String not found / diff impossible**: skip, log to
  `history/<week>/apply-log.json` with `{issue, reason: "string_mismatch",
evidence}`, continue.
- **Layout conflict (two issues modify the same region incompatibly)**:
  apply issue with higher severity first; skip the lower one with
  reason `layout_conflict`; continue.
- **Merge impossible after 2 auto-fix attempts in the review/fix loop**:
  skip, log reason `fix_loop_exceeded`, continue.

**PR-level response (after all issues processed):**

- **All 5 issues applied**: open normal PR.
- **1–4 issues skipped, at least 1 applied**: open PR with `[partial]`
  label and a "Skipped issues" section in the PR body listing each
  skipped issue + reason + next-step suggestion.
- **0 issues applied (all skipped)**: do NOT open a PR; post a
  structured report to `history/<week>/apply-failed.md` and notify the
  operator via GitHub issue.
- **Any skipped issue is CRITICAL severity**: PR opens as draft (not
  ready), even if others applied cleanly. Operator decides whether the
  partial ship is acceptable given the CRITICAL skip.

**Rationale:** partial progress > blocked-entirely; the operator sees
every skip in the PR body, no silent failures. Fail-fast would block
other fixes for no reason. Auto-escalate to Opus is expensive and
negates the autonomy claim.

**Open:** `[R-confirm]` whether draft-on-CRITICAL-skip is the right
default.

---

## Q6 — Preview URL strategy

**Decision (85/100):** Cloudflare Pages PR preview URLs. **Confirmed live
today** — `curl -sI https://certified.richerhealth.ca/` returns
Cloudflare `report-to` headers (CF Pages behind CF CDN). Every PR against
the production repo auto-generates a preview URL like
`pr-<n>.<project>.pages.dev`; operator reviews on that URL with zero
infra cost.

**Rationale:**

- Standard pattern — CF Pages does this out of the box when a GitHub repo
  is connected. No custom subdomain, no staging wrangler, no manual
  deploy step.
- Disposable — preview URL dies when PR closes. No long-lived staging to
  maintain.
- Zero risk to production — separate origin, separate analytics ID
  (operator must scrub the Umami `data-website-id` on preview builds —
  see below).
- Operator can share the preview URL with stakeholders for a pre-merge
  eyeball without giving GitHub access.

**Gotchas to handle in #39e (preview URL wiring):**

- **Analytics contamination**: the live LP fires `umami` analytics with
  `data-website-id="2d335573-..."`. Preview builds should either strip
  the script OR replace the site-id with a preview-only id. Otherwise
  preview traffic pollutes the real analytics that the monitor reads.
  Fix: build-time env flag, `data-preview="1"` gates the script.
- **Canonical tag**: the after/ index.html now has
  `<link rel="canonical" href="https://certified.richerhealth.ca/">`.
  On a preview URL this would still point canonical to prod — fine for
  SEO (preview pages shouldn't index), but verify preview URLs get
  `X-Robots-Tag: noindex`.
- **UTM passthrough**: the Calendly JS snippet reads `window.location.search`.
  Preview URLs won't have real UTMs; the snippet should no-op cleanly
  (it already does — empty `queryString` branch handles it).

**Multi-tenancy note:** when Webster is sold beyond Richie, the preview
URL strategy stays per-client via their own CF Pages project. Each
client's repo → CF Pages project → PR previews. Webster just needs to
write the preview URL into `history/<week>/apply-log.json` after PR
creation so the operator doesn't have to hunt for it.

**Fallback:** if a client isn't on CF Pages / Vercel / Netlify, the apply
PR falls back to "clone locally + serve" instructions in the PR body.
Higher friction, usable.

**Open:** none — this one is resolved.

---

## Deferred to a later grill-me

- Visual-design critic: standing (Opus-sample-to-ground-truth) vs.
  spawn-each-week. Leaning standing.
- Multi-site vs. single-site from day 1. Leaning single-site; multi-site
  is a v2 week 4+ feature.
- Trigger cadence (every merge vs. on-demand vs. weekly). Leaning weekly
  - on-demand override.
- Review step composition — new code-focused `webster-code-reviewer`
  critic vs. re-run the existing 5. Leaning re-run existing with ONE
  new `apply-diff-reviewer` that's code-aware (current critics read
  rendered HTML; apply reviewer reads diffs).
- Iteration cap on review/fix loop. Default proposed: 3 loops, then
  skip + annotate.

---

## Operational intel for the next critic cycle

From today's session — critic blind-spot finding:

The conversion + seo critics both flagged CTAs as dead based on static
greps for `acuityscheduling` / `href="#"`. Reality: CTAs wire via
`data-calendly-base` + a JS snippet that rewrites `.href` at page load.
The critics missed a runtime-wiring pattern.

**Apply-worker implication:** Q2's headless-browser runtime check is
partly motivated by this. The apply worker should catch the same class
of error before opening a PR.

**Critic-upgrade implication (separate from apply worker):** before v2
week 2, update `agents/conversion-critic.json` and `agents/seo-critic.json`
to include a static-analysis pass for:

- `data-calendly-base`, `data-calendly`, `data-acuity`, `data-book-base`
  style data-attr wiring patterns.
- `class="booking-cta"` or similar CTA-flag class patterns + matching
  `<script>` blocks that assign to `.href`.

Any critic that grep's for booking URLs should ALSO grep for
runtime-rewrite patterns, or fall back to "inconclusive — recommend
headless validation" rather than a false CRITICAL.

---

## FEATURES.md translation (Phase 3 output preview)

See `context/FEATURES.md` for the concrete #39a–e and #40a–d rows landed
during Phase 3 of this session.
