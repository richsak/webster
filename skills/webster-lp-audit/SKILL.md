---
name: webster-lp-audit
description: LP audit discipline for Webster council critics — read patterns, findings format, severity rubric. Canonical reference; contents are inlined into each critic's system prompt for V1. Upload to /v1/skills for V2 polish.
---

# Webster LP Audit Discipline

Universal audit discipline shared across all Webster council critics. For V1 each critic's system prompt inlines the relevant sections; this file is the single source of truth for future updates.

## Reading patterns (token economy)

- Never dump full files. Use `Read` with `offset` / `limit` for files >200 lines.
- Scope greps by path and file type: `grep -rn "pattern" site/src/ --include="*.astro"`, never bare `grep -r`.
- Read in layers: glob → grep → targeted line-range Read. Each layer narrows the search.
- Read prior-week findings at `context/critics/<your-role>/findings.md` ONCE at session start.
- For live audits: WebFetch the target URL once, analyze the rendered HTML in memory — do not refetch per check.

## Findings format (mandatory)

Write to `context/critics/<your-role>/findings.md`:

```markdown
# Findings — Week YYYY-MM-DD

## Issues identified

- [CRITICAL|HIGH|MEDIUM|LOW] <one-line issue> — <evidence: file:line or quoted line>

## Patterns observed

- <recurring pattern across weeks, if prior findings exist>

## Out of scope (flag for redesigner or Genealogy)

- [<scope-owner>] <issue outside your ownership>
```

## Severity rubric

- **CRITICAL** — regulatory risk, broken trust signal, load-path regression. Legal exposure or blocks conversion.
- **HIGH** — material measurable impact: CWV regression, duplicate H1, broken CTA target, missing testimonial proof, banned claim language.
- **MEDIUM** — friction / drift: weak headline, vague benefit framing, heading hierarchy off-by-one, incomplete JSON-LD.
- **LOW** — polish / consistency: minor tone drift, non-critical alt text, spacing inconsistencies.

**Hard cap: 10 findings total.** Promote top 10 by severity. Demote the rest to "Patterns observed" or drop.

## Out-of-scope discipline

If you see an issue outside your scope (e.g. you're the SEO critic and see a banned medical claim):

1. Do NOT fix it.
2. Do NOT add it to "Issues identified" under your name.
3. Add it to "Out of scope" with owner tag — `[fh-compliance] "heal chronic disease" claim in hero — regulatory check`.

The orchestrator reads "Out of scope" flags across all critics. Gap patterns — issues no existing critic owns — trigger Critic Genealogy to spawn a new specialist mid-run.

## Git mechanics (your system prompt has the full flow)

- Clone URL, branch name, and week date come in your bootstrap user.message.
- Findings are committed from inside your session (no external state store).
- Commit message pattern: `chore(<role>-critic): week YYYY-MM-DD findings`.
