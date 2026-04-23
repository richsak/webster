---
name: managed-agents-patterns
description: |
  Use when: Authoring a new Claude Managed Agent YAML for Webster's council (critics, monitor, redesigner). Provides the canonical pattern that keeps Codex streams producing consistent configs across 8 agents.
  Triggers: "new critic yaml", "managed agent pattern", "author managed agent", "critic template".
---

# Managed Agent Pattern (Webster Council)

Canonical YAML for pre-registered Claude Managed Agents that form Webster's Council of 7 (plus redesigner).

## Model tier table (cost discipline)

| Role | Model | Why |
|---|---|---|
| `monitor` | `claude-haiku-4-5` | Analytics anomaly detection — cheap, fires first |
| 5 critics (SEO, brand-voice, FH-compliance, conversion, copy) | `claude-sonnet-4-6` | Critic default — quality at moderate cost |
| `redesigner` | `claude-opus-4-7` | Synthesis + proposal generation — quality matters |

**Never** use Opus 4.7 for critics. Never use Sonnet for the monitor. Tier discipline is part of the demo story.

## Base template

```yaml
name: <agent-slug>                       # e.g., "brand-voice-critic"
version: "1.0"
description: <one-line purpose>

model: claude-sonnet-4-6                 # or haiku-4-5 / opus-4-7 per tier table

system_prompt: |
  You are a <role> in Webster's landing-page improvement council.

  # Scope
  Your job is ONLY <specific responsibility>. You do NOT:
  - Propose redesigns (that's the redesigner's job)
  - Judge other critics (critics are independent)
  - Touch git, deploy, or anything outside reading LP + writing findings

  # Input
  Read from the run directory (Webster mounts this via resources):
  - `lp/` — current landing page source
  - `context/business.md` — brand + business identity
  - `context/critics/<your-name>/findings.md` — your previous findings (memory)
  - `history/last-week/` — last week's run for diff context

  # Output
  Write findings to `context/critics/<your-name>/findings.md` — git-committed between runs, this is your persistent memory across weekly sessions.

  Format:
  ```markdown
  # Findings — Week YYYY-MM-DD

  ## Issues identified
  - [CRITICAL|HIGH|MEDIUM|LOW] <one-line issue> — <evidence from LP>

  ## Patterns observed
  - <recurring pattern across multiple weeks>

  ## Out of scope (flag for redesigner or Genealogy)
  - <issue you noticed but don't own>
  ```

toolset: agent_toolset_20260401          # bash, read, write, edit, glob, grep, web_fetch, web_search

environment:
  image: anthropic/claude-agent:ubuntu-22.04
  ram_gb: 4
  disk_gb: 5
  network: unrestricted                  # or 'limited' with allowed_hosts for defense-in-depth

resources:
  - type: github_repository
    repo: <user>/<repo>
    ref: main
    checkout_path: /workspace/repo

mcp_servers: []                          # remote URL only — no bundled MCPs in sandbox

callable_agents: []                      # only redesigner uses this
```

## Role-specific additions

### `brand-voice-critic`
- Scope: tone consistency vs `context/business.md` brand voice
- Severity: CRITICAL (off-brand word/phrase), HIGH (tonal mismatch), MEDIUM (weak word choice), LOW (style nitpick)

### `fh-compliance-critic`
- Scope: functional-health compliance — DSocSci disclaimers, no "treatment"/"cure" claims, proper credential citation
- Severity: CRITICAL (legal risk), HIGH (disclaimer missing), MEDIUM (weak framing), LOW (polish)

### `conversion-critic`
- Scope: CTA clarity, trust signals, form friction
- Uses `web_fetch` to test the live sign-up flow end-to-end

### `seo-critic`
- Scope: meta tags, heading hierarchy, schema markup, Core Web Vitals (reads Lighthouse via `web_fetch`)

### `copy-critic`
- Scope: plain-language readability (Hemingway grade ≤8 for consumer-facing sections), concrete-vs-abstract verb ratio

### `monitor` (haiku)
- Scope: analytics anomaly detection (reads KV analytics store via Cloudflare Worker)
- Fires FIRST in the council run — informs other critics if anomalies exist

### `redesigner` (opus)
- Scope: synthesize all critics' findings into ONE redesign proposal
- `callable_agents: [monitor, brand-voice-critic, fh-compliance-critic, conversion-critic, seo-critic, copy-critic]`
- Output: `history/YYYY-MM-DD/proposal.diff` + `decision.json`
- ALSO owns Critic Genealogy: if gap detected, POSTs `/v1/agents` to register a new critic, then invokes it immediately

## Registration flow

Agents are pre-registered via `POST /v1/agents` in the ORCHESTRATOR session (Claude Code). NEVER from inside a Managed Agent's own loop — Managed Agents research preview disallows runtime agent creation from within an agent's sandbox.

```bash
curl -X POST https://api.anthropic.com/v1/agents \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-beta: agent-api-2026-03-01" \
  -H "Content-Type: application/json" \
  --data @agents/brand-voice-critic.yaml
```

Capture the returned `agent_id` in `context/critics/<name>/id.txt`.

## Critic Genealogy (runtime creation)

The redesigner (Opus 4.7, in the orchestrator session) is the ONLY actor that creates new critics at runtime:

1. Detects pattern no existing critic addresses
2. Authors new YAML (`agents/<new-role>-critic.yaml`)
3. POSTs to `/v1/agents` (orchestrator-level, not inside a Managed Agent)
4. Invokes via `/v1/sessions` immediately with the new `agent_id`
5. Commits new spec + session log to `history/YYYY-MM-DD/genealogy/`

This is the demo hero beat. Keep it clean — a judge should see: "gap → new critic → live invocation → improved proposal" in 30 seconds.

## Do

- Keep system prompts ≤50 lines. Verbose prompts = context bloat.
- One critic = one scope. If scope touches >1 concern, split into 2 critics.
- Commit `context/critics/<name>/findings.md` every run. Memory lives in git, not in session state.
- Use `agent_toolset_20260401` — don't craft custom toolsets unless truly necessary.

## Don't

- Don't let critics call other critics (`callable_agents: []` for all except redesigner).
- Don't hardcode API keys. Use `environment.env` with variable refs.
- Don't bundle custom MCP inside the sandbox — remote URL only.
- Don't exceed 8 memory stores per session (research preview limit).
- Don't mix Opus and Sonnet tiers for critics — tier discipline is part of the story.
