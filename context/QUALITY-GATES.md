# Quality Gates

> Validation rules. Mirrors Forge pattern. Mirror of [[webster-quality-gates]] in vault.

## Single command

```bash
bun run validate
```

Chains:

```bash
bun run type-check &&
bun run lint --max-warnings 0 &&
bun run format:check &&
bun run validate:agents &&
bun run validate:findings &&
bun run validate:md &&
bun run test
```

Every gate is BLOCKING. No soft warnings. No `--no-verify`.

## Individual Gates

### Type Check — blocking

`tsc --noEmit` via `bun run type-check`

- All `.ts`, `.tsx` files
- `strict: true`, `noUncheckedIndexedAccess: true`
- Zero `any` without `// TS-any: <reason>` justification comment

### Lint — blocking, zero warnings

`eslint . --cache --max-warnings 0`

- Forge pattern: zero tolerance
- Auto-fix: `bun run lint:fix`

### Format — blocking

`prettier --check .`

- Auto-fix: `bun run format`

### Agent + Environment schemas — blocking

`bun scripts/validate-agents.ts`

- `agents/*.json` validated against `scripts/schemas/agent.schema.json` (Managed Agents spec)
- `environments/*.json` validated against `scripts/schemas/environment.schema.json`
- Catches `system_prompt` / `callable_agents` / wrong-model-ID / missing-required-field class bugs with field-typo hints
- Schema is derived from the 7 specs that registered successfully on 2026-04-23 — ground truth, not memory of the API

### Findings format — blocking

`bun scripts/validate-findings.ts`

- `context/critics/*/findings.md` must have `# Findings` H1, `## Issues`, `## Out of scope`, ≥1 `[SEVERITY]` tag
- `context/monitor/alerts.md` must have `# Alerts` H1
- Stub files with the literal "No runs yet." phrase are accepted (before first council run)

### Markdown — blocking

`markdownlint-cli2`

- Ruleset in `.markdownlint-cli2.jsonc`: default rules with MD013 (line length) / MD033 (inline HTML) / MD041 (first line H1) disabled
- Ignores: symlinked `.claude/skills`, submodule-like `.agents`, dynamic agent outputs, external dirs

### Tests — blocking for critical paths

`bun test`

- Current: schema happy-path + known-bad-spec rejection tests
- Future critical paths: orchestrator, Critic Genealogy registration, skill Q&A flow

## Husky pre-commit (lax until 2026-04-26 submission)

`.husky/pre-commit` runs:

```sh
bun run validate:agents
# prettier --check on staged .ts/.js/.json/.md/.jsonc only
```

Lax by design — blocks on the bugs that cost API credits (agent spec drift, `system_prompt`-class typos) without blocking routine commits during the hackathon crunch on formatting nits. Full `bun run validate` still runs in CI on every push/PR.

Tighten to the full chain after hackathon submission.

## CI Pipeline

`.github/workflows/test.yml`:

- Triggers: push to `main` / `dev` + PRs targeting `main` / `dev`
- Jobs:
  - `validate` — full chain (type-check / lint / format / agents / findings / md / test)
  - `shellcheck` — warns on `.sh` files and `.husky/pre-commit`
  - `actionlint` — lints `.github/workflows/*.yml`
  - `site-build` — skipped until `site/` exists, then Astro build on every push (see `context/SITE-FORK-CHECKLIST.md`)

## Commit Conventions

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `refactor:` — code restructure without behavior change
- `test:` — test-only changes
- `chore:` — tooling, deps, CI

Subject: lowercase, imperative, under 72 chars. Optional scope: `feat(skill): ...`

## Pre-merge checklist

- [ ] `bun run validate` green
- [ ] Tests for new behavior (if applicable)
- [ ] AGENTS.md / context/ updated if architecture changed
- [ ] Vault decision-log updated if a decision was revisited
- [ ] No `// TODO` without linked issue
- [ ] No secrets committed
- [ ] No Forge imports

## Anti-patterns

- **Silent fallbacks** — no `catch { return defaultValue }` that hides errors
- **Mock-in-prod** — mock analytics values only in seed scripts, not runtime paths
- **Skipped gates** — never `--no-verify`, `--no-gpg-sign`, `--force`
- **Fake progress** — functions must actually complete their contract

## If gate fails

1. State the failure clearly
2. Reproduce locally
3. Propose 2-3 fixes with tradeoffs
4. Never bypass

If tool is misconfigured, fix the config. Don't disable the gate.
