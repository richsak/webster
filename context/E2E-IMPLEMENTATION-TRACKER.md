# Webster E2E Implementation Tracker

> Handoff file for compaction recovery. Read this first if the session is resumed. Last updated: 2026-04-25.

## Operating mode

- Execute directly; do not wait for approval unless a task has unresolved ambiguity.
- Preserve production Webster:
  - Do not modify the existing production `agents/webster-*` specs unless the task explicitly says so.
  - Do not modify `prompts/second-wbs-session.md`.
- Validate before claiming completion.
- Prefer narrow reads and targeted edits.
- Use subagents for repo-wide audits or isolated review so the main context stays lean.

## Current repo state summary

Verified by main session + subagent scout:

| Task                     | Current status                               | Evidence / notes                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T0 Pass-7 fixes          | Done in tree                                 | `scripts/apply-worker-cli.ts`, `scripts/apply-worker.ts`, `.husky/pre-commit`, `scripts/anthropic-agents.ts`, `scripts/planner-invoke.ts`, `scripts/critic-genealogy.ts`; targeted tests passed. Perl byte-count acceptance says 13 but actual correct count is 14.     |
| T1 Memory stores         | Appears implemented                          | `scripts/provision-memory-stores.ts`, tests exist. Needs validation/live run if not already done.                                                                                                                                                                       |
| T2 Sim agents            | Appears implemented                          | 18 `agents/webster-{lp,site}-sim-*.json` specs and `scripts/register-sim-agents.ts` exist.                                                                                                                                                                              |
| T3 Contexts              | Appears implemented                          | `demo-landing-page/context/*`, `demo-sites/northwest-reno/context/*`, `scripts/context-schema.ts` exist.                                                                                                                                                                |
| T4 Ugly sites            | Partial / uncommitted                        | Ugly files exist but `git status` shows modified/untracked assets. Needs browser/render check and commit cleanup.                                                                                                                                                       |
| T5 Synthetic analytics   | Appears implemented                          | `scripts/synthetic-analytics.ts` and tests exist.                                                                                                                                                                                                                       |
| T6 Sim council fork      | Appears implemented                          | `prompts/sim-council.md` and tests exist.                                                                                                                                                                                                                               |
| T7 Simulation wrapper    | Appears implemented                          | `scripts/run-simulation.ts` and tests exist.                                                                                                                                                                                                                            |
| T8 Entrypoints           | Appears implemented                          | `scripts/run-simulation-lp.ts`, `scripts/run-simulation-site.ts` exist.                                                                                                                                                                                                 |
| T9 Manifest/final sheets | Appears implemented                          | `scripts/build-demo-manifest.ts` and tests exist.                                                                                                                                                                                                                       |
| T10 Full dry run         | Not done                                     | No evidence of full dual 10-week run and handoff.                                                                                                                                                                                                                       |
| T11 Auto-capture         | Implemented / needs authenticated screenshot | Added capture script, bridge, preflight, screenshot manifest, package scripts, and CAPTURE_TRIGGER emission. `browser-use` requires `-b real --profile Default`; current local Console session is logged out, so authenticated PNG acceptance still needs Richie login. |
| T12 Onboarding v2        | Not started                                  | Missing `scripts/onboarding/*` and status flow. Secondary/case-study path.                                                                                                                                                                                              |
| T13 Empire Asphalt       | Not started / blocked                        | Blocked on consent artifact. Missing brand corpus and external demo repo.                                                                                                                                                                                               |

## Current validation state

Latest full validation is green:

```bash
bun run validate
# 181 pass, 0 fail
```

T11 preflight correctly fails until Richie logs into Anthropic Console in local Chrome `Default` profile:

```bash
bun run sim:preflight
# AUTH_EXPIRED: Anthropic Console Memory Stores page is not authenticated/reachable
```

Auth-expired capture path was verified against the current local Chrome state:

```bash
bun scripts/capture-mem-stores.ts '<week-1 trigger json>'
# exits 1 with AUTH_EXPIRED because local Anthropic Console is not logged in
```

Targeted T0 tests passed earlier:

```bash
bun test scripts/__tests__/anthropic-agents.test.ts scripts/__tests__/critic-genealogy.test.ts scripts/__tests__/apply-worker-cli.test.ts
# 50 pass, 0 fail
```

## Immediate next steps

### Step A — Restore green baseline

Done. `bun run validate` is green.

### Step B — Verify implemented tasks T1-T9 before adding new code

Run fast, scoped checks first:

```bash
bun test \
  scripts/__tests__/provision-memory-stores.test.ts \
  scripts/__tests__/register-sim-agents.test.ts \
  scripts/__tests__/context-schema.test.ts \
  scripts/__tests__/synthetic-analytics.test.ts \
  scripts/__tests__/sim-council.test.ts \
  scripts/__tests__/run-simulation.test.ts \
  scripts/__tests__/run-simulation-entrypoints.test.ts \
  scripts/__tests__/build-demo-manifest.test.ts
```

Then run full `bun run validate` again.

### Step C — Finalize T4 uncommitted ugly-site state

1. Review ugly-site diffs:

   ```bash
   git diff -- demo-landing-page/ugly demo-sites/northwest-reno/ugly
   find demo-landing-page/ugly demo-sites/northwest-reno/ugly -maxdepth 3 -type f
   ```

2. Confirm no JS and no external network resources:

   ```bash
   rg -n "<script|https?://|//" demo-landing-page/ugly demo-sites/northwest-reno/ugly
   ```

3. Browser/render smoke check with existing screenshot tooling or Playwright file URLs.
4. Commit only T4-related files if validation passes:

   ```bash
   git add demo-landing-page/ugly demo-sites/northwest-reno/ugly
   git commit -m "feat: add ugly simulation substrates"
   ```

### Step D — Implement T11 auto-capture infrastructure

Implemented files:

- `scripts/capture-mem-stores.ts`
- `scripts/sim-capture-bridge.ts`
- `scripts/sim-preflight.ts`
- `scripts/emit-memory-screenshot-manifest.ts`
- `scripts/__tests__/sim-capture.test.ts`
- `scripts/run-simulation.ts` emits exact `CAPTURE_TRIGGER` JSON at weeks 1, 5, and 10.
- `package.json` has `sim:lp`, `sim:site`, `sim:capture-bridge`, `sim:preflight`, `sim:emit-manifest`.

Verified:

- `bun run sim:preflight` now enforces authenticated Console reachability and currently fails with `AUTH_EXPIRED`, as intended while logged out.
- Auth-expired path exits non-zero with `AUTH_EXPIRED`.
- Bridge tests prove capture failure halts.
- Trigger format matches `prompts/sim-runner.md`.
- `bun run validate` green.

Remaining T11 live acceptance:

- Richie must log into Anthropic Console in local Chrome profile `Default`.
- Manual Memory Stores screenshot is available at `assets/memory-stores-screenshots/manual/console-memory-stores-2026-04-25.png`.
- `bun run sim:emit-manifest` writes a manifest containing this manual proof.
- Auto-capture is optional. If required, set `WEBSTER_REQUIRE_CONSOLE_CAPTURE=1` and re-run `bun run sim:preflight`; it should return 0 only after authenticated Console reachability is confirmed.
- Then commit: `feat: capture memory store console screenshots`.

### Step E — T10 full dry run and handoff

Run after T11:

```bash
bun run validate
bun run sim:preflight
# token-enabled session only:
bun scripts/provision-memory-stores.ts
bun scripts/register-sim-agents.ts
bun scripts/run-simulation-lp.ts | bun scripts/sim-capture-bridge.ts
bun scripts/run-simulation-site.ts | bun scripts/sim-capture-bridge.ts
bun run sim:emit-manifest
bun scripts/build-demo-manifest.ts
bun run validate
```

Manual checks:

- Both `demo-output/landing-page/` and `demo-output/northwest-reno/` have week progressions.
- Screenshots render at 375/768/1440; no blank pages.
- Week 10 visibly improves over week 0.
- Memory stores contain meaningful summaries.
- Genealogy outcome documented honestly.

Commit final handoff assets only if appropriate:

```bash
git add demo-output assets/memory-stores-screenshots history
 git commit -m "chore: finalize simulation handoff assets"
```

## Secondary path after core demo

### T12 onboarding v2

Implement only after T10 or if Richie makes the case-study video the priority.

Files:

- `skills/webster-onboarding/SKILL.md`
- `scripts/onboarding/verify-env.ts`
- `scripts/onboarding/verify-all.ts`
- `scripts/onboarding/scaffold-repo.ts`

Acceptance: no key leakage, phase gates, idempotent status file, live verification.

### T13 Empire Asphalt

Do not start until consent exists:

- `assets/onboarding-case-study/dad-consent.txt`

Then prepare:

- `context/brand-corpus/*`
- private `richsak/empire-paving-demo` repo
- ugly v0 Astro site with Empire palette.

## If compaction happens

1. Read this file.
2. Read `context/VISION.md` locked section.
3. Run `git status --short`.
4. Run `bun run validate` or the last scoped test listed above.
5. Continue from the first unchecked step in `Immediate next steps`.
