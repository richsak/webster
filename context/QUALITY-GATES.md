# Quality Gates

> Validation rules. Mirrors Forge pattern. Mirror of [[webster-quality-gates]] in vault.

## Single command

```bash
bun run validate
```

Chains:
```
bun run type-check &&
bun run lint --max-warnings 0 &&
bun run format:check &&
bun run validate:yaml &&
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

### YAML Schema — blocking
`bun scripts/validate-yaml.ts`
- `agents/*.yaml` against Managed Agents spec
- `routines/*.yaml` against Routine spec
- Required fields, allowed field names, type checks

### Tests — blocking for critical paths
`bun test`
- Critical paths: orchestrator, Critic Genealogy registration, skill Q&A flow
- Coverage target: behavior correctness, not percentage

## Husky pre-commit

`.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

bun run type-check && \
bun run lint --max-warnings 0 && \
bun run format:check
```

Full test suite runs in CI (not pre-commit) for speed.

## CI Pipeline

`.github/workflows/test.yml`:
- Triggers: push to `main` + PRs to `main`
- Jobs: `validate` (full chain) + `site-build` (Astro build check)

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
