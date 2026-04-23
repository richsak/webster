# Webster

> A Council of Claude Managed Agents that autonomously redesigns small-business landing pages weekly.

**Built with Opus 4.7** — Anthropic × Cerebral Valley Hackathon (April 26 2026).

## What it does

Each week, 7 Claude Managed Agents audit a small-business landing page, propose improvements, and open a PR with Opus 4.7's reasoning in the body. When the human merges, Cloudflare Workers + Static Assets auto-deploys the improved site. When the council detects a pattern no existing critic catches (e.g. medical-claims language on a health-practitioner site), Opus 4.7 autonomously authors a new critic YAML, registers it as a Managed Agent via the Anthropic API, and runs it — emergent capability in git history.

## Who it's for

Small-business owners who want ongoing landing-page optimization without paying a marketing agency $2-20k/mo for 4-6 week improvement cycles. Webster replaces that workflow with $100 of Opus 4.7 tokens and one PR-merge click per week.

## One-command demo replay

```bash
git clone https://github.com/<tbd>/webster
cd webster
claude /onboard
```

The onboarding skill walks you through:
1. Business context Q&A (your brand, target persona)
2. Claude Design `.zip` upload (your starter LP → Astro components)
3. Subdomain pointing (we help; you own the domain)
4. GitHub App + Cloudflare Workers connection
5. API key paste (your `ANTHROPIC_API_KEY` + account-scoped `CLOUDFLARE_API_TOKEN`)
6. First council run — see the improvements, merge the PR, watch it deploy

## Architecture

```
Claude Code Routine (weekly cron)
  └─ Claude Code session (orchestrator, Opus 4.7)
     ├─ invokes 6 Managed Agents (monitor + 5 critics + redesigner)
     ├─ detects gap, registers new critic via /v1/agents, runs it (Critic Genealogy)
     └─ opens PR via gh CLI with reasoning

GitHub merge → Workers Builds webhook → Cloudflare Workers redeploys
```

Scheduled agent holds ONLY a GitHub token. Cloudflare credentials are onboarding-only.

Full details: [`context/ARCHITECTURE.md`](context/ARCHITECTURE.md).

## Repo layout

```
webster/
├── routines/         # Claude Code Routine YAMLs
├── agents/           # 7 Managed Agent YAMLs (pre-registered critics + redesigner)
├── skills/           # Onboarding skill + shared critic-flow skill
├── site/             # Astro substrate (fork of customer LP)
├── history/          # Weekly run artifacts (analytics, council-output, PRs, decisions)
├── webster/          # CLI package (forge-mini-cli)
├── context/          # Architecture + features + quality gates
├── .github/workflows # CI (type-check, lint, format, test, YAML schema)
└── README.md
```

## Development

```bash
bun install           # dependencies
bun run validate      # full quality gate (type, lint, format, test)
bun run dev           # local development
```

See [`AGENTS.md`](AGENTS.md) for operator/agent usage.

## Meta

Every layer of this submission uses Opus 4.7:
- **Agent YAMLs**: authored by Opus 4.7
- **Orchestrator logic**: authored by Opus 4.7
- **Onboarding skill**: authored by Opus 4.7
- **Demo narration**: scripted by Opus 4.7
- **Demo animations**: composed by Claude via Remotion
- **This README**: co-authored by Opus 4.7

Commit hashes for each meta-attribution are in [`context/META.md`](context/META.md).

## License

MIT. See [LICENSE](LICENSE).
