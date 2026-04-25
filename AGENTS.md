# AGENTS.md — Webster Operator Guide

> Canonical operator guide for this repo. Read before starting any task.

Webster is operated by two agent classes:

1. **Implementation operators** — Claude Code (Opus 4.7), Codex/Pi (via Forge). Drive parallel-worktree builds.
2. **Runtime critics** — Claude Managed Agents (specs in `agents/*.json`) that run the weekly LP council.

This file is for implementation operators. See `skills/webster-lp-audit/SKILL.md` for runtime critic guidance.

## Mission

Two active workstreams:

- **Production Webster** — Nicolette's weekly landing-page improvement council runs on `main` via `prompts/second-wbs-session.md`. This is live for her business; do not break it.
- **Hackathon expansion** — Dual-substrate demo (Richer Health LP + Northwest Home Renovations 3-page site) with a simulation runner producing timelapse assets. Deadline **2026-04-28**. Working branch: `dev/`. See `context/VISION.md` for canonical north-star.

## First actions every session

1. `AGENTS.md` (this file)
2. `context/ARCHITECTURE.md` — current system design
3. `context/FEATURES.md` — shipped state + stream allocation
4. `context/VISION.md` — canonical north-star for the active hackathon expansion. If about to code or make an architectural call, this doc tells you whether you're drifting.
5. `context/EXPANSION-TASKS.md` — topologically ordered tasks with acceptance criteria
6. `context/QUALITY-GATES.md` — validation rules (mirror Forge pattern)
7. `~/Vault/Projects/webster/webster-decision-log.md` — architectural decisions with rationale

## Communication with Richie

- Lead with recommendations rated X/100. Never present options without scores.
- Layman's terms, real-world analogies, not code.
- Challenge directly. No caveats, no permission-asking, no enthusiasm-padding.
- If stuck, say so — don't produce a polished workaround that hides the difficulty.
- Visible struggle > invisible corner-cutting.

## Branch strategy

- `main` — production Webster. Nicolette's live council runs here. Stable.
- `dev` — hackathon expansion trunk. All expansion work eventually merges here. Once the submission ships, `dev` rolls up to `main` as a single batch.
- **Feature / worktree branches → PR to `dev`, not `main`.**
- Never force-push to `main` or `dev`.

## Worktree + PR flow

Every task in `context/EXPANSION-TASKS.md` (and any other implementation work during the hackathon expansion) follows this pattern:

1. **Branch off `dev`**, not `main`:
   - Claude Code (manual): `git worktree add ../webster-T<n>-<slug> dev -b feat/T<n>-<slug>`
   - Forge workers: spawn from the `dev` base; Forge auto-creates `forge/task-feat-<slug>` branches (existing pattern)
2. Work on the worktree branch. Commits conventional (`feat:` / `fix:` / `test:` / `docs:` / `refactor:` / `chore:`)
3. Push the branch and open a PR with **base = `dev`**
4. After review + green CI, merge the PR into `dev` (squash preferred for feature branches; merge commit acceptable for Forge multi-commit task branches)
5. Delete the feature branch after merge. Local worktree cleanup per the Forge lifecycle rules

Feature branch naming:

- Claude Code manual: `feat/T<n>-<kebab-slug>` (example: `feat/T1-memory-provisioning`)
- Forge-generated: `forge/task-feat-<slug>` (unchanged from existing pattern)
- `fix:` for Pass-7 review fixes and bug fixes: `fix/T0-pass7-visual-veto` style

Hackathon rollup procedure (after T10 completes):

- Final `dev → main` merge is a single PR with the full expansion as a commit block
- Nicolette's production council on `main` is not affected until that PR lands
- Do NOT merge `dev → main` in pieces before T10 completes — the expansion lands atomically so production stays coherent

## Operating rules

### Do

- Work one feature at a time per worktree
- Commit via conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Run `bun run validate` before declaring a feature done
- Update `context/FEATURES.md` with status transitions
- Mirror Forge validation discipline (zero lint warnings, full type check, format check, tests)
- Surface `[STUCK]` prefix if a path isn't clear — don't compose around it

### Don't

- Import Forge code. Webster is standalone.
- Write comments that explain what code does (well-named identifiers do that). Only write comments when the WHY is non-obvious.
- Create documentation files unless explicitly requested.
- Use emojis unless explicitly requested.
- Add backwards-compatibility hacks (no unused `_` vars, no re-export stubs, no `// removed` comments).
- Expand scope beyond the feature at hand (no drive-by refactors).
- Introduce frameworks beyond the locked stack (Astro 6, Claude API, Managed Agents, Remotion, Cloudflare Workers)
- Invent architecture without updating `webster-decision-log` in vault
- Bypass validation (`--no-verify`, `--no-gpg-sign`, `--force`)
- Fabricate analytics numbers or business stats
- Silently catch errors to make things look green
- Touch the existing 9 production `webster-*` agents during hackathon expansion — they run Nicolette's real council. Sim agents are additive (`webster-lp-sim-*`, `webster-site-sim-*`).
- Touch `prompts/second-wbs-session.md` — it's the production orchestrator. Sim orchestrator is a fork at `prompts/sim-council.md`.

## Quality gates

Every commit goes through husky pre-commit (type-check + lint + format). CI runs full suite.

```bash
bun run validate
# = type-check + lint --max-warnings 0 + format:check + test
```

## Task pickup protocol (hackathon expansion)

1. Check `context/EXPANSION-TASKS.md` — pick next unblocked task in topological order. Do NOT skip T0.
2. Re-read the task's acceptance criteria
3. Read every file the task touches before editing
4. Implement minimally — no scope expansion, no drive-by refactors
5. Write the tests listed in acceptance criteria
6. `bun run validate` — must be green
7. Conventional commit (one task = one commit or a small series)
8. Before marking done: re-read `context/VISION.md` "what's locked" section, verify no drift

## Handling the task list

Use `TaskCreate` / `TaskUpdate` for multi-step work within a single session. Tasks are session-scoped; long-term project state lives in `context/` + vault `webster-*.md` files.

## Git hygiene

- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Never force-push to `main` or `dev/`
- Never use `--no-verify` or `--no-gpg-sign`
- If pre-commit hook fails, fix the issue and create a new commit (not `--amend`)
- If you're stuck on a hook failure, surface it — don't bypass

## Skill invocation (Claude Code)

Webster ships two runtime-critic skills:

- `skills/webster-lp-audit/SKILL.md` — shared council run flow (referenced by production critics)
- `skills/webster-onboarding/SKILL.md` — end-user onboarding flow (universal, demo placeholder)

If your work modifies either skill, test with a sample invocation before committing.

## Parallel stream etiquette

- Your worktree is yours. Don't touch other worktrees.
- If you need to coordinate with another stream, leave a `[COORDINATE: stream-N]` note in your session output.
- Daily merge checkpoints resolve conflicts.

## When requirements conflict

State the conflict. Don't paper over it.

## When in doubt

Consult `~/Vault/Projects/webster/webster-decision-log.md` — every locked decision with rationale.

If a path isn't clear and VISION.md / EXPANSION-TASKS.md don't answer, leave a `[STUCK]` or `[QUESTION]` prefix in your session output. Don't compose around it.
