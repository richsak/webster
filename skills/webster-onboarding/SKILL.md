---
name: webster-onboarding
description: |
  Use when: A small-business owner wants to install Webster on their own landing page. Triggers the entire first-time setup — credentials, domain pointing, Claude Design bundle import, GitHub connection, first council run.
  Triggers: "install webster", "set up webster on my site", "onboard webster", "new webster site", "webster setup".
---

# Webster Onboarding

You're guiding a small-business owner (likely non-technical) through Webster's first-time setup. Use plain language. Bracket-define unavoidable technical terms inline — e.g., "API key [the password your site uses to talk to Claude]".

## Prerequisites (user has these ready)

1. **Anthropic API key** — from `console.anthropic.com` — used by all 7 council agents
2. **Cloudflare API token** with "Workers Edit" scope — from `dash.cloudflare.com/profile/api-tokens`
3. **GitHub account** — for the repo storing their landing page
4. **Claude Design bundle** — a `.zip` exported from `claude.ai/design` (their LP design)
5. **Domain or subdomain** — that they own and want Webster to run on

Ask if any are missing. STOP if any aren't ready — don't try to "mock" them.

## Onboarding flow

### Step 1: Business identity (30s)

Ask, one at a time, and wait for each answer:

- Business name?
- One-line description (what you sell, to whom)?
- Brand voice: friendly, clinical, casual, premium, or other?

Write answers to `context/business.md` as a structured markdown file.

### Step 2: API keys (60s)

Ask the user to paste keys one at a time. Write them to `.env.local` (NOT `.env` — that's tracked):

```ini
ANTHROPIC_API_KEY=<paste>
CLOUDFLARE_API_TOKEN=<paste>
GITHUB_TOKEN=<optional, for private repo access>
```

Verify each key works:

- Anthropic: `curl -s https://api.anthropic.com/v1/models -H "x-api-key: $ANTHROPIC_API_KEY" | jq '.data[0]'`
- Cloudflare: `curl -s https://api.cloudflare.com/client/v4/user/tokens/verify -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"`

If any fail, show the exact error. STOP. Don't proceed on broken keys.

### Step 3: Claude Design import (2 min)

Ask: "Paste the absolute path to the `.zip` you downloaded from Claude Design, or drag it in."

Unzip to `tmp/design-import/`. Read its `README.md` — the bundle's own guide for coding agents.

Translate HTML sections + JSX components in the bundle into Astro components at `src/pages/index.astro` + `src/components/*.astro`. Pull assets into `src/assets/`. Use the bundle's CSS tokens if present.

Run `bun run build` to verify compile. If it fails: show errors verbatim, STOP.

### Step 4: Domain pointing (2 min)

Ask: "What domain should Webster deploy to?"

**Branch A — Cloudflare-managed domain**: user's domain is already on Cloudflare.

- Configure `wrangler.jsonc` with `custom_domain: true` and their zone
- `wrangler deploy` — Cloudflare auto-creates the DNS record

**Branch B — External DNS**: domain is elsewhere.

- Deploy to `<project>.workers.dev` first (`wrangler deploy`)
- Show user: "In your DNS provider, add a CNAME record pointing `<their-subdomain>` to `<project>.workers.dev`"
- Wait for DNS propagation (up to 5 min). Verify via `dig <domain>`.

### Step 5: GitHub connection (2 min)

Ask: "Is your landing page already in a GitHub repo, or should Webster create one?"

- **Existing repo**: generate the GitHub App install link via Cloudflare API for Workers Builds. Deep-link the user to install it.
- **New repo**: `gh repo create <user>/<biz-slug>-landing-page --private --source=. --push`

Connect Workers Builds to the repo so PRs auto-deploy on merge.

### Step 6: First council run (10 min)

Trigger: `forge workflow run webster-ralph-dag --branch run/first-council "Read context/business.md and run the full council weekly-loop pass"`

This fires the DAG: monitor → 5 critics → redesigner → PR → Cloudflare deploy.

Surface the PR URL when ready. Tell user: "Your first council run is live. Webster will run again next Sunday. You'll get a PR email when improvements are proposed. Merge when ready."

## End state (after onboarding is complete)

- `context/business.md` with brand context
- `.env.local` with 3 verified keys
- Astro site with user's Claude Design imported
- Domain pointing to Cloudflare deployment
- GitHub repo connected to Workers Builds
- Open PR with council's Week 1 redesign proposal
- Weekly Routine scheduled (Sundays 23:00 UTC)

## Do

- Paste user inputs verbatim into files; never paraphrase keys or domains
- Show each command before running it
- Verify each API key when received
- Make the first council run visible — it's the "this is real" moment

## Don't

- Don't make up fallback keys or a "test mode"
- Don't hide errors mid-step to keep momentum
- Don't ask multiple questions at once. One at a time, wait for each answer.
- Don't assume the user knows DNS/CNAME/Workers — bracket-define inline
