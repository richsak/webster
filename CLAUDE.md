# CLAUDE.md

Guidance for Claude Code sessions operating on this repo.

## First actions every session

1. Read `AGENTS.md` — operator guide, stream allocation, rules
2. Read `context/ARCHITECTURE.md` — current system design
3. Read `context/FEATURES.md` — pick next feature for your stream

## Communication with Richie

- Lead with recommendations rated X/100. Never present options without scores.
- Layman's terms, real-world analogies, not code.
- Challenge directly. No caveats, no permission-asking, no enthusiasm-padding.
- If stuck, say so — don't produce a polished workaround that hides the difficulty.
- Visible struggle > invisible corner-cutting.

## Quality bar

Mirror Forge's validation pattern (it's what Richie's trained on):
- Zero lint warnings tolerated
- Full type check blocking
- Format check blocking (prettier)
- Tests green required
- No `any` without justification comment
- No silent fallbacks — errors propagate or are explicitly handled
- No fabricated data in runtime code (seed scripts are the only place mock data lives)

Run `bun run validate` before declaring any feature done.

## Don't

- Import Forge code. Webster is standalone.
- Write comments that explain what code does (well-named identifiers do that). Only write comments when the WHY is non-obvious.
- Create documentation files unless explicitly requested.
- Use emojis unless explicitly requested.
- Add backwards-compatibility hacks (no unused `_` vars, no re-export stubs, no `// removed` comments).
- Expand scope beyond the feature at hand (no drive-by refactors).

## Handling the task list

Use `TaskCreate` / `TaskUpdate` for multi-step work within a single session. Tasks are session-scoped; long-term project state lives in `context/` + vault `webster-*.md` files.

## Git hygiene

- Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Never force-push to `main` or `dev`
- Never use `--no-verify` or `--no-gpg-sign`
- If pre-commit hook fails, fix the issue and create a new commit (not `--amend`)
- If you're stuck on a hook failure, surface it — don't bypass

## Stream coordination

- Check `git log --all --oneline -20` before starting — know what other streams have landed
- Pull latest before starting a feature
- Merge conflicts: resolve, don't discard; if unclear who wins, ASK Richie

## Skill invocation

Webster ships two skills:
- `skills/onboard-smb/SKILL.md` — end-user onboarding flow (universal)
- `skills/critic-flow/SKILL.md` — shared critic run flow (referenced by all 7 agents)

If your work modifies either skill, test with a sample invocation before committing.

## Parallel stream etiquette

- Your worktree is yours. Don't touch other worktrees.
- If you need to coordinate with another stream, leave a `[COORDINATE: stream-N]` note in your session output.
- Daily merge checkpoints resolve conflicts.

## When in doubt

Consult `~/Vault/Projects/webster/webster-decision-log.md` — every locked decision with rationale.

Still stuck? Surface with `[STUCK]` prefix. No composed workarounds.
