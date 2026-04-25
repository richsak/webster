# AGENTS.md — Webster Operator Guide

> Read this before starting any task in this repo.

Webster is operated by two agent classes:

1. **Implementation operators** — Claude Code (Opus 4.7) and Codex (GPT-5.4) driving Forge for parallel-worktree builds.
2. **Runtime critics** — 7 Claude Managed Agents (defined in `agents/*.yaml`) that run the weekly LP audit loop.

This file is for implementation operators. See `skills/critic-flow/SKILL.md` for runtime critic guidance.

## Mission

Ship the Webster submission for the Anthropic × Cerebral Valley "Built with Opus 4.7" hackathon by **Sunday April 26 2026 8PM EST**. Optimize for composite prize-lane value, not grand alone.

## Read before starting

1. `README.md` — public pitch + architecture summary
2. `context/ARCHITECTURE.md` — full system design
3. `context/FEATURES.md` — feature list with status; pick one in your stream
4. `context/QUALITY-GATES.md` — validation rules (mirror Forge pattern)
5. `~/Vault/Projects/webster/webster-decision-log.md` — all architectural decisions with rationale
6. `~/Vault/Projects/webster/webster-forge-guide.md` — how Forge should operate on this repo

## Stream allocation (parallel worktrees)

| Stream | Operator             | Worktree    | Features                                                |
| ------ | -------------------- | ----------- | ------------------------------------------------------- |
| 1      | Claude Code Opus 4.7 | `main`      | Orchestrator + Critic Genealogy + Routine config        |
| 2      | Codex heartbeat      | `agents`    | 7 Managed Agent YAMLs + environment config              |
| 3      | Codex heartbeat      | `skill`     | Onboarding skill + Claude Design .zip parser            |
| 4      | Claude Code or Forge | `video`     | Remotion comps + animations                             |
| 5      | Claude Code          | `substrate` | LP fork + analytics pixel + 10-week mock history seeder |

Merge cadence: Thursday EOD, Friday EOD, Saturday noon.

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
- Introduce frameworks beyond the locked stack (Astro 6, Claude API, Managed Agents, Remotion, Cloudflare Workers)
- Invent architecture without updating `webster-decision-log` in vault
- Bypass validation (`--no-verify`, `--no-gpg-sign`, `--force`)
- Fabricate analytics numbers or business stats
- Silently catch errors to make things look green

## Quality gates

Every commit goes through husky pre-commit (type-check + lint + format). CI runs full suite.

```bash
bun run validate
# = type-check + lint --max-warnings 0 + format:check + test
```

## Feature pickup protocol

1. Check `context/FEATURES.md` — find next feature with status `todo`
2. Read feature description + referenced architecture section
3. Mark feature `in-progress` (commit this change first)
4. Implement on your stream's worktree
5. Run `bun run validate`
6. Commit with `feat:` message including feature number
7. Mark feature `done` in `context/FEATURES.md` (or leave `in-progress` with progress note)
8. Merge to main per stream cadence

## When requirements conflict

State the conflict. Don't paper over it. Pre-committed cut order in `webster-open-loops` vault file if Friday 6PM behind pace.

## Questions for the human operator

If you need direction that's not covered here or in the vault, leave a `[QUESTION]` prefix in your session output. Don't assume.
