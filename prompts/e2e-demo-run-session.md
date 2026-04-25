# Webster E2E Demo Run Session

## Mission

Run the Webster end-to-end demo pipeline and produce the final handoff assets for video composition.

This session is allowed to use Anthropic API tokens. Do not run this prompt in a token-restricted session.

## Read first

1. `AGENTS.md`
2. `context/VISION.md`
3. `context/EXPANSION-TASKS.md`
4. `context/E2E-IMPLEMENTATION-TRACKER.md`
5. `prompts/sim-runner.md`

## Current prepared state

- Core validation was green before this handoff: `bun run validate` → 181 tests passing.
- Core preflight does not require browser Console auth:
  - `bun run sim:preflight`
- Manual Memory Stores screenshot already exists:
  - `assets/memory-stores-screenshots/manual/console-memory-stores-2026-04-25.png`
- Manual screenshot manifest already supports this proof path:
  - `bun run sim:emit-manifest`
- Auto-capture remains available but optional:
  - strict mode: `WEBSTER_REQUIRE_CONSOLE_CAPTURE=1 bun run sim:preflight`
  - bridge: `bun run sim:lp 2>&1 | bun run sim:capture-bridge`

## Hard rules

- Do not modify production agents.
- Do not modify `prompts/second-wbs-session.md`.
- Do not run both substrates in parallel.
- Do not hide failures. If a council run fails repeatedly, stop and report `[STUCK]` with the failing command and last 40 lines.
- Do not require Console screenshot auto-capture; manual proof is already present.

## Recommended run path

### 1. Confirm clean enough state

```bash
git status --short
bun run validate
bun run sim:preflight
```

If validation fails from unrelated formatting, fix formatting only and rerun. If tests fail, stop.

### 2. Ensure provisioned API resources

These use Anthropic API tokens and are expected in this session:

```bash
bun scripts/provision-memory-stores.ts
bun scripts/register-sim-agents.ts
```

Expected outputs:

- `context/memory-stores.json` contains 12 store IDs.
- `context/sim-agents.json` contains 18 sim agent IDs.

### 3. Run LP simulation

Use the no-auto-capture path first:

```bash
bun run sim:lp
```

If Richie explicitly wants fresh Console milestone screenshots and is logged into Anthropic Console in Chrome profile `Default`, use:

```bash
bun run sim:lp 2>&1 | bun run sim:capture-bridge
```

### 4. Run site simulation

```bash
bun run sim:site
```

Optional auto-capture variant:

```bash
bun run sim:site 2>&1 | bun run sim:capture-bridge
```

### 5. Emit screenshot manifest

```bash
bun run sim:emit-manifest
```

This should include the manual screenshot under `manual_proof`. Auto week screenshots are optional unless `WEBSTER_REQUIRE_AUTO_MEMORY_SCREENSHOTS=1` is set.

### 6. Build demo manifests and final sheets

```bash
bun scripts/build-demo-manifest.ts
```

Expected outputs:

- `demo-output/landing-page/demo-manifest.json`
- `demo-output/landing-page/final-sheet.png`
- `demo-output/northwest-reno/demo-manifest.json`
- `demo-output/northwest-reno/final-sheet.png`
- `assets/memory-stores-screenshots/manifest.json`

### 7. Inspect handoff assets

Check visually and structurally:

```bash
find demo-output -maxdepth 3 -type f | sort | sed -n '1,120p'
find assets/memory-stores-screenshots -maxdepth 3 -type f | sort
```

Manual inspection checklist:

- Week 0 and week 10 screenshots exist for both substrates.
- Final sheets are not blank.
- LP and Northwest Reno visibly improve.
- Genealogy outcome is documented honestly: spawn, no-spawn, or diagnosed rerun.
- Memory proof screenshot exists and is referenced in manifest.

### 8. Final validation

```bash
bun run validate
```

If green, report:

- commands run
- key output paths
- whether genealogy spawned
- final validation result
- any assets still missing for video composition

## If stuck

Use this exact format:

```text
[STUCK] <short failure>
Command: <command>
Last output:
<last 40 lines>
What I tried:
- ...
Recommendation: <one direct next action with score/100>
```
