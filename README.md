# Webster

> A council of 7 Claude Managed Agents that autonomously audits a small-business landing page every week, synthesizes the findings, and opens a PR with the proposed redesign.

**Built with Opus 4.7** — Anthropic × Cerebral Valley Hackathon submission (deadline 2026-04-26).

## The one-line pitch

Small businesses pay marketing agencies $2K–$20K/month for landing-page optimization that arrives in 4–6 week cycles. Webster runs the audit + proposal loop for ~$0.60/month in Opus 4.7 tokens and hands the operator a reviewable draft PR each week. The win is cycle time (minutes vs weeks) and the baseline cost of the analytical loop — a human still reviews the PR before it ships.

## The hero moment — Critic Genealogy

The 5 pre-registered critics (SEO, brand-voice, functional-health-compliance, conversion, copy) each cover one scope. They commit findings to a shared branch and flag cross-cutting issues in their `Out of scope` sections.

When >=2 critics flag the same scope as unowned, [`scripts/critic-genealogy.ts`](scripts/critic-genealogy.ts) asks Opus 4.7 to (a) author a new critic spec, (b) register it live via `POST /v1/agents`, and (c) invoke it on the same council branch — all at runtime, no human in the loop.

Proof it works: fixture dry-run against the 5 committed critics' findings produces a schema-valid `accessibility-critic` spec with 7 focus bullets, 6 cross-tagged out-of-scope bullets, and a WCAG-tuned severity rubric. Live Opus call, ~$0.03, ~15s:

```bash
bun scripts/critic-genealogy.ts --fixtures scripts/__tests__/fixtures/genealogy --dry-run
```

## Architecture

```text
            weekly trigger (cron, manual, or wbs prompt)
                              │
                              ▼
          Claude Code orchestrator session (Opus 4.7)
                              │
                              ▼
                      Planner (Opus 4.7)
                 memory + verdicts → plan.md
                              │
               fans out 6 sessions in parallel ─┐
                                                │
  ┌───────┬──────────┬──────────┬────────┬──────┴─┐
  │  SEO  │  brand   │ FH-compl │  CRO   │ copy   │  monitor
  │ Sonnet│ Sonnet   │  Sonnet  │ Sonnet │ Sonnet │  Haiku
  │  4.6  │   4.6    │   4.6    │  4.6   │  4.6   │   4.5
  └───┬───┴────┬─────┴─────┬────┴────┬───┴────┬───┘
      │        │           │         │        │
      └────────┴─── each critic commits via GitHub MCP ──┐
                  to council/<week-date> branch          │
                                                         ▼
                     Critic Genealogy (Opus 4.7, runtime)
                     gap? → new critic spec → POST /v1/agents
                          → POST /v1/sessions → commits findings
                                                         │
                                                         ▼
                              Redesigner (Opus 4.7)
                              reads all findings on branch
                              commits proposal.md + decision.json
                                                         │
                                                         ▼
                              Draft PR opened
                              human merges → Cloudflare redeploys
```

**Why this composition wins**: Managed Agents give each critic a pre-registered scope + MCP tools + vault credentials. Runtime agent registration via `POST /v1/agents` lets the orchestrator spawn specialists mid-run — novel capability that `callable_agents` (research preview) would handicap by gating. Full detail in [`context/ARCHITECTURE.md`](context/ARCHITECTURE.md).

**Honest scope note**: the `site/` fork of the demo substrate LP and the Claude Code Routine cron wiring are manual in this submission — the composition does not depend on either. The redesigner currently emits `proposal.md` (the PR body) instead of `proposal.diff`; diff mode becomes a one-file change once the site source lands.

## What's in the repo

```text
webster/
├── agents/              7 Managed Agent JSON specs (5 critics + monitor + redesigner)
├── context/             architecture, features, quality gates, per-critic findings dirs
├── environments/        webster-council-env.json (single Anthropic environment)
├── prompts/             first-wbs-session.md (bootstrap), second-wbs-session.md (weekly run)
├── scripts/             validate-agents, validate-findings, critic-genealogy
├── skills/              webster-lp-audit (shared critic discipline), webster-onboarding
├── .github/workflows/   CI: type + lint + format + schema + findings + markdown + tests
├── .husky/              pre-commit runs the same gates locally
└── AGENTS.md            operator guide for in-repo work
```

## The weekly flow

The live council runner is a bash-in-markdown prompt: [`prompts/second-wbs-session.md`](prompts/second-wbs-session.md). It:

1. Seeds 10 weeks of mock analytics on first run (monitor needs baselines to diff).
2. Prepares a shared `council/YYYY-MM-DD` branch.
3. Runs the planner — marshals `history/memory.jsonl`, recent verdicts, and monitor anomalies; writes `history/YYYY-MM-DD/plan.md`.
4. Fans out 6 Managed Agent sessions (monitor + 5 critics) — each commits `context/critics/<scope>/findings.md` via GitHub MCP.
5. Validates findings via `bun scripts/validate-findings.ts`.
6. Runs the redesigner — commits `history/YYYY-MM-DD/proposal.md` + `decision.json`.
7. Opens a draft PR.

Expected wall-clock: 30–50 min. Expected API cost: ~$0.16–0.25 per run.

**Submission note**: all 7 agent specs are registered against the live Anthropic API (IDs in `environments/webster-council-env.id` + `context/*/id.txt`), the genealogy hero is live-validated (~$0.03 Opus 4.7 dry-run documented above), and the full orchestration prompt is committed. The end-to-end 6-agent fan-out that produces `history/YYYY-MM-DD/` artifacts is the operator-triggered weekly run — `history/` is empty at submission time by design. Loop has been exercised component-by-component.

## Quality gates

Mirrors Forge's validation discipline. One command:

```bash
bun run validate
```

Chains: `tsc --noEmit` → `eslint --max-warnings 0` → `prettier --check` → agent+environment schema validation → findings format validation → markdownlint → `bun test`. Every gate is blocking. Pre-commit hook enforces the same set. CI enforces the same set on push + PR. See [`context/QUALITY-GATES.md`](context/QUALITY-GATES.md).

Current state: 29 tests passing, 0 lint warnings, 0 type errors, 8 JSON specs valid, 6 findings files valid.

## Prize-lane alignment

- **Best Use of Claude Managed Agents** — 7 pre-registered agents + runtime-registered genealogy critics, all invoked via `/v1/sessions` with vault-bound GitHub MCP (no tokens in `user.message`).
- **Creative Exploration** — runtime critic genealogy. Gap detection → template-cloned spec → live `POST /v1/agents` → immediate invocation. The emergent-capability demo beat.

## Running it yourself

### Prerequisites

- `bun >= 1.3.0`
- `jq` (for bash scripts inside the prompts)
- `gh` CLI (authenticated to the target repo)
- `git` with commit-signing configured
- An Anthropic API key stored in macOS keychain under service `anthropic-webster`. First-session will show the exact `security add-generic-password` command if missing.

### Bootstrap (one-time)

```bash
wbs @prompts/first-wbs-session.md
```

Registers the single environment + 7 agents against the Anthropic API. Runs an SEO hello-world to prove the council loop end-to-end. Artifacts: `environments/webster-council-env.id` + `context/{monitor,redesigner,critics/*}/id.txt`.

### Weekly council run

```bash
wbs @prompts/second-wbs-session.md
```

Runs the full planner + fan-out + redesigner + draft PR described above.

### Spawn a genealogy critic manually

```bash
bun scripts/critic-genealogy.ts --branch council/$(date -u +%Y-%m-%d)
```

Reads the week's findings, asks Opus 4.7 if any scope is unowned, and spawns + registers + invokes a new critic if yes. Use `--fixtures scripts/__tests__/fixtures/genealogy --dry-run` to see the flow without making API writes.

## Meta-attribution

Every layer uses Opus 4.7 as author:

| Layer                           | Opus 4.7 role                                                             |
| ------------------------------- | ------------------------------------------------------------------------- |
| 7 agent specs (`agents/*.json`) | Drafted during bootstrap session, validated against live API              |
| Bootstrap + weekly prompts      | Opus-authored during dispatcher sessions; in git history                  |
| Critic Genealogy script         | Opus-authored; see `dcf5726` + `e474301`                                  |
| Redesigner synthesis            | Opus 4.7 at runtime — its decision.json outputs live in `history/<date>/` |
| Runtime critic spawning         | Opus 4.7 selects the gap AND authors the new spec via `tool_use`          |

Repo is entirely MIT. No Anthropic or third-party proprietary code.

## License

MIT. See [LICENSE](LICENSE).
