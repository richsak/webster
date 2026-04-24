#!/usr/bin/env bun
/**
 * Critic Genealogy — runtime critic spawning.
 *
 * Scans committed findings from a weekly council run, asks Opus 4.7 to
 * identify one pattern that no existing critic addresses, clones
 * brand-voice-critic.json as a template, substitutes the new scope,
 * registers the spec via POST /v1/agents, creates a session with
 * vault_ids, sends the standard BRANCH/WEEK_DATE/LP_TARGET message,
 * polls until idle, and commits spec + session log to
 * history/<date>/genealogy/.
 *
 * Hero beat for $5K Creative Exploration prize lane.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const API = "https://api.anthropic.com/v1";
const BETA = "managed-agents-2026-04-01";
const VERSION = "2023-06-01";
const VAULT_ID = "vlt_011CaLe2pEofWQptxQyV4UMd";
const LP_TARGET_DEFAULT = "https://certified.richerhealth.ca";
const TEMPLATE_PATH = "agents/brand-voice-critic.json";
const POLL_INTERVAL_MS = 30_000;
const POLL_DEADLINE_MS = 20 * 60 * 1000;
const DEDUP_SIMILARITY_THRESHOLD = 0.6;
const QUARTERLY_CAP_MAX_SPAWNS = 3;
const QUARTERLY_CAP_WINDOW_DAYS = 13 * 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ROOT = resolve(import.meta.dir, "..");

interface NewCriticSpec {
  name: string;
  scope: string;
  description: string;
  rationale: string;
  focus_owned: string[];
  focus_not_owned: string[];
  severity_rubric: string;
}

interface GapResponse {
  gap_found: boolean;
  new_critic: NewCriticSpec | null;
}

interface AgentJSON {
  name: string;
  description: string;
  model: string;
  system: string;
  tools: unknown[];
  mcp_servers?: unknown[];
  metadata?: Record<string, string>;
}

interface CriticSummary {
  name: string;
  scope: string;
  description: string;
}

interface DedupDecision {
  allowed: boolean;
  closestCritic: CriticSummary | null;
  similarity: number;
  candidateScope: string;
}

type EmbeddingVector = Map<string, number> | number[];
type EmbeddingFn = (text: string) => EmbeddingVector;

interface CLIArgs {
  branch: string | null;
  fixtures: string | null;
  weekDate: string;
  lpTarget: string;
  dryRun: boolean;
  overrideQuarterlyCap: boolean;
}

interface QuarterlyCapDecision {
  allowed: boolean;
  recentSpawnCount: number;
  windowStart: string;
  windowEnd: string;
  overrideUsed: boolean;
}

class CLIError extends Error {}

function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = {
    branch: null,
    fixtures: null,
    weekDate: new Date().toISOString().slice(0, 10),
    lpTarget: LP_TARGET_DEFAULT,
    dryRun: false,
    overrideQuarterlyCap: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--branch") {
      args.branch = argv[++i] ?? null;
    } else if (a === "--fixtures") {
      args.fixtures = argv[++i] ?? null;
    } else if (a === "--week") {
      args.weekDate = argv[++i] ?? args.weekDate;
    } else if (a === "--lp-target") {
      args.lpTarget = argv[++i] ?? args.lpTarget;
    } else if (a === "--dry-run") {
      args.dryRun = true;
    } else if (a === "--override-quarterly-cap") {
      args.overrideQuarterlyCap = true;
    } else if (a === "--help" || a === "-h") {
      throw new CLIError("help");
    } else {
      throw new CLIError(`unknown arg: ${a}`);
    }
  }
  if (!args.branch && !args.fixtures) {
    throw new CLIError("one of --branch or --fixtures is required");
  }
  if (args.branch && args.fixtures) {
    throw new CLIError("--branch and --fixtures are mutually exclusive");
  }
  return args;
}

function printUsage(): void {
  console.log(`Usage:
  bun scripts/critic-genealogy.ts --branch <council-branch> [--week YYYY-MM-DD] [--lp-target URL] [--dry-run] [--override-quarterly-cap]
  bun scripts/critic-genealogy.ts --fixtures <dir> [--week YYYY-MM-DD] [--lp-target URL] [--dry-run] [--override-quarterly-cap]

Examples:
  bun scripts/critic-genealogy.ts --branch council/2026-04-23
  bun scripts/critic-genealogy.ts --fixtures scripts/__tests__/fixtures/genealogy --dry-run`);
}

function getAPIKey(): string {
  const fromEnv = process.env.ANTHROPIC_API_KEY;
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const key = execFileSync(
      "security",
      ["find-generic-password", "-s", "anthropic-webster", "-a", process.env.USER ?? "", "-w"],
      { encoding: "utf8" },
    ).trim();
    if (key) {
      return key;
    }
  } catch {
    // fall through to fail
  }
  console.error("ERROR: ANTHROPIC_API_KEY missing from env AND macOS keychain.");
  console.error(
    'Fix: security add-generic-password -U -s anthropic-webster -a "$USER" -w "sk-ant-..."',
  );
  process.exit(1);
}

function loadEnvironmentId(): string {
  const idFile = join(ROOT, "environments/webster-council-env.id");
  if (!existsSync(idFile)) {
    console.error(`ERROR: ${idFile} missing — run first-wbs-session.md to register env`);
    process.exit(1);
  }
  const id = readFileSync(idFile, "utf8").trim();
  if (!id.startsWith("env_")) {
    console.error(`ERROR: environment id malformed: ${id}`);
    process.exit(1);
  }
  return id;
}

function loadExistingCritics(): CriticSummary[] {
  const agentsDir = join(ROOT, "agents");
  const specs: CriticSummary[] = [];
  for (const f of readdirSync(agentsDir)) {
    if (!f.endsWith("-critic.json")) {
      continue;
    }
    const raw = JSON.parse(readFileSync(join(agentsDir, f), "utf8")) as AgentJSON;
    const scope = raw.metadata?.scope ?? f.replace("-critic.json", "");
    specs.push({ name: raw.name, scope, description: raw.description });
  }
  specs.sort((a, b) => a.scope.localeCompare(b.scope));
  return specs;
}

function loadFindingsFromFixtures(dir: string): Map<string, string> {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) {
    console.error(`ERROR: fixtures dir not found: ${abs}`);
    process.exit(1);
  }
  const map = new Map<string, string>();
  for (const f of readdirSync(abs)) {
    const match = f.match(/^(.+)-findings\.md$/);
    if (!match || !match[1]) {
      continue;
    }
    map.set(match[1], readFileSync(join(abs, f), "utf8"));
  }
  if (map.size === 0) {
    console.error(`ERROR: no *-findings.md files under ${abs}`);
    process.exit(1);
  }
  return map;
}

function textForDedup(scope: string, description: string): string {
  return `${scope}\n${description}`.toLowerCase();
}

function embedText(text: string): EmbeddingVector {
  const vector = new Map<string, number>();
  const tokens = text.match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      throw new Error(`embedding vectors have different lengths: ${a.length} vs ${b.length}`);
    }
    let dot = 0;
    let aNorm = 0;
    let bNorm = 0;
    for (let i = 0; i < a.length; i++) {
      const aValue = a[i] ?? 0;
      const bValue = b[i] ?? 0;
      dot += aValue * bValue;
      aNorm += aValue * aValue;
      bNorm += bValue * bValue;
    }
    return aNorm === 0 || bNorm === 0 ? 0 : dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    throw new Error("embedding vector types must match");
  }

  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (const value of a.values()) {
    aNorm += value * value;
  }
  for (const [key, value] of b.entries()) {
    bNorm += value * value;
    dot += (a.get(key) ?? 0) * value;
  }
  return aNorm === 0 || bNorm === 0 ? 0 : dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm));
}

function evaluateCriticDedup(
  candidate: NewCriticSpec,
  activeCritics: CriticSummary[],
  embed: EmbeddingFn = embedText,
): DedupDecision {
  const candidateEmbedding = embed(textForDedup(candidate.scope, candidate.description));
  let closestCritic: CriticSummary | null = null;
  let similarity = 0;

  for (const critic of activeCritics) {
    const criticEmbedding = embed(textForDedup(critic.scope, critic.description));
    const score = cosineSimilarity(candidateEmbedding, criticEmbedding);
    if (!closestCritic || score > similarity) {
      closestCritic = critic;
      similarity = score;
    }
  }

  return {
    allowed: similarity < DEDUP_SIMILARITY_THRESHOLD,
    closestCritic,
    similarity,
    candidateScope: candidate.scope,
  };
}

function printDedupRejection(decision: DedupDecision): void {
  console.error("GOVERNANCE BLOCK: duplicate critic scope detected.");
  console.error(`  closest existing critic: ${decision.closestCritic?.name ?? "none"}`);
  console.error(`  similarity: ${decision.similarity.toFixed(3)}`);
  console.error(`  candidate scope: ${decision.candidateScope}`);
}

function parseHistoryDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`history date must be YYYY-MM-DD: ${value}`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`history date is invalid: ${value}`);
  }
  return date;
}

function formatHistoryDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function countRecentGenealogySpawns(historyRoot: string, weekDate: string): number {
  const windowEnd = parseHistoryDate(weekDate);
  const windowStart = new Date(windowEnd.getTime() - QUARTERLY_CAP_WINDOW_DAYS * MS_PER_DAY);

  if (!existsSync(historyRoot)) {
    return 0;
  }

  let count = 0;
  for (const entry of readdirSync(historyRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
      continue;
    }

    const entryDate = parseHistoryDate(entry.name);
    if (entryDate < windowStart || entryDate > windowEnd) {
      continue;
    }

    const genealogyDir = join(historyRoot, entry.name, "genealogy");
    if (!existsSync(genealogyDir)) {
      continue;
    }

    const specPath = join(genealogyDir, "spec.json");
    if (!existsSync(specPath)) {
      throw new Error(`malformed genealogy history: missing ${specPath}`);
    }

    try {
      const parsed = JSON.parse(readFileSync(specPath, "utf8")) as AgentJSON;
      if (!parsed.name || !parsed.description) {
        throw new Error("spec.json must include name and description");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`malformed genealogy history: ${specPath}: ${message}`);
    }
    count += 1;
  }
  return count;
}

function evaluateQuarterlyCap(
  historyRoot: string,
  weekDate: string,
  overrideQuarterlyCap: boolean,
): QuarterlyCapDecision {
  const windowEnd = parseHistoryDate(weekDate);
  const windowStart = new Date(windowEnd.getTime() - QUARTERLY_CAP_WINDOW_DAYS * MS_PER_DAY);
  const recentSpawnCount = countRecentGenealogySpawns(historyRoot, weekDate);
  const overCap = recentSpawnCount >= QUARTERLY_CAP_MAX_SPAWNS;
  return {
    allowed: !overCap || overrideQuarterlyCap,
    recentSpawnCount,
    windowStart: formatHistoryDate(windowStart),
    windowEnd: formatHistoryDate(windowEnd),
    overrideUsed: overCap && overrideQuarterlyCap,
  };
}

function printQuarterlyCapBlock(decision: QuarterlyCapDecision): void {
  console.error("GOVERNANCE BLOCK: quarterly critic spawn cap reached.");
  console.error(`  recent genealogy spawns: ${decision.recentSpawnCount}`);
  console.error(`  cap: ${QUARTERLY_CAP_MAX_SPAWNS} per 13 weeks`);
  console.error(`  window: ${decision.windowStart}..${decision.windowEnd}`);
  console.error("  override: rerun with --override-quarterly-cap after operator approval");
}

function loadFindingsFromBranch(branch: string, critics: CriticSummary[]): Map<string, string> {
  execFileSync("git", ["fetch", "origin", branch], { stdio: "inherit" });
  const map = new Map<string, string>();
  for (const c of critics) {
    const path = `context/critics/${c.scope}/findings.md`;
    try {
      const body = execFileSync("git", ["show", `origin/${branch}:${path}`], {
        encoding: "utf8",
      });
      map.set(c.scope, body);
    } catch {
      console.warn(`  (no findings for ${c.scope} on ${branch})`);
    }
  }
  if (map.size < 3) {
    console.error(
      `ERROR: only ${map.size} findings files on ${branch}. Need >=3 for gap detection.`,
    );
    process.exit(1);
  }
  return map;
}

function buildGapPrompt(
  critics: CriticSummary[],
  findings: Map<string, string>,
  lpTarget: string,
  weekDate: string,
): string {
  const criticsBlock = critics
    .map((c, i) => `${i + 1}. ${c.name} — scope: ${c.scope}\n   ${c.description}`)
    .join("\n\n");
  const findingsBlock = [...findings.entries()]
    .map(([scope, body]) => `### ${scope}\n\n${body.trim()}`)
    .join("\n\n---\n\n");
  return `You are the Webster orchestrator performing CRITIC GENEALOGY — runtime detection of coverage gaps in the council.

## Existing critics (5)

${criticsBlock}

## This week's findings

Each critic committed a findings.md on the council branch. Full contents below:

${findingsBlock}

## Context

- LP_TARGET: ${lpTarget}
- WEEK_DATE: ${weekDate}
- Pay special attention to each critic's "Out of scope" section — these are concrete things the critic SAW but DIDN'T own. Cross-critic repetition there is the strongest gap signal.

## Task

Identify ONE narrow, auditable scope that:

1. Is mentioned in >=2 critics' Out-of-scope sections as unowned.
2. Does NOT overlap with any existing critic's scope.
3. Is a single coherent dimension a Sonnet 4.6 critic could audit weekly.
4. Has concrete evidence in the findings (not speculative).

If such a gap exists, spawn a new critic. If not, set gap_found=false and new_critic=null. Better to ship nothing than a spurious critic.

## Output

Call the report_gap tool. Do not output prose.`;
}

async function detectGap(
  apiKey: string,
  critics: CriticSummary[],
  findings: Map<string, string>,
  lpTarget: string,
  weekDate: string,
): Promise<GapResponse> {
  const prompt = buildGapPrompt(critics, findings, lpTarget, weekDate);
  const body = {
    model: "claude-opus-4-7",
    max_tokens: 4096,
    tools: [
      {
        name: "report_no_gap",
        description:
          "Report that no coverage gap exists this week. The council's 5 critics covered everything auditable.",
        input_schema: {
          type: "object",
          additionalProperties: false,
          required: ["rationale"],
          properties: {
            rationale: {
              type: "string",
              minLength: 30,
              description: "Why no gap — which potential scopes were considered and rejected.",
            },
          },
        },
      },
      {
        name: "report_gap",
        description:
          "Report a coverage gap and spec the new critic that should fill it. Use ONLY when >=2 critics flagged the same scope as unowned in their Out-of-scope sections.",
        input_schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "scope",
            "description",
            "rationale",
            "focus_owned",
            "focus_not_owned",
            "severity_rubric",
          ],
          properties: {
            name: { type: "string", pattern: "^[a-z][a-z0-9-]*-critic$" },
            scope: { type: "string", pattern: "^[a-z][a-z0-9-]*$" },
            description: { type: "string", minLength: 20, maxLength: 500 },
            rationale: { type: "string", minLength: 30 },
            focus_owned: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 10,
            },
            focus_not_owned: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 10,
            },
            severity_rubric: { type: "string", minLength: 50 },
          },
        },
      },
    ],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: prompt }],
  };
  const res = await fetch(`${API}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gap-detection failed (${res.status}): ${text}`);
  }
  const raw = (await res.json()) as { content: { type: string; name?: string; input?: unknown }[] };
  const toolUse = raw.content.find((c) => c.type === "tool_use");
  if (!toolUse?.input) {
    throw new Error(`gap-detection returned no tool_use: ${JSON.stringify(raw)}`);
  }
  if (toolUse.name === "report_no_gap") {
    const input = toolUse.input as { rationale: string };
    console.log(`no gap rationale: ${input.rationale}`);
    return { gap_found: false, new_critic: null };
  }
  if (toolUse.name === "report_gap") {
    return { gap_found: true, new_critic: toolUse.input as NewCriticSpec };
  }
  throw new Error(`gap-detection returned unknown tool: ${toolUse.name}`);
}

function buildSystemPrompt(spec: NewCriticSpec): string {
  const focusOwnedBullets = spec.focus_owned.map((b) => `- ${b}`).join("\n");
  const focusNotOwnedBullets = spec.focus_not_owned.map((b) => `- ${b}`).join("\n");
  return `You are the ${spec.name} in Webster's landing-page improvement council for Dr. Nicolette Richer / Richer Health.

# Bootstrap (first action)
Your user.message supplies: BRANCH, WEEK_DATE, LP_TARGET.

Repo coordinates for all GitHub MCP calls: owner=richsak, repo=webster.

The container has NO git credentials and NO local clone of the repo. All file IO happens through GitHub MCP tools (bound to the repo via a vault credential). Do NOT attempt \`git clone\`, \`git push\`, or any shell git command — they will fail. Do NOT ask for a WEBSTER_REPO_URL — there isn't one.

1. Call WebFetch on $LP_TARGET once for rendered HTML analysis. This is your PRIMARY evidence source.
2. Call github MCP \`get_file_contents\` (owner=richsak, repo=webster, path=context/business.md, ref=main) — if it 404s, skip.
3. Call github MCP \`get_file_contents\` (owner=richsak, repo=webster, path=context/critics/${spec.scope}/findings.md, ref=main) — prior week's findings for memory. If 404, treat as week 1.
4. If site/ exists on main: \`get_file_contents\` path=site to list entries, then targeted per-file reads.

# Scope (ONLY ${spec.scope})
You own:
${focusOwnedBullets}

You do NOT own:
${focusNotOwnedBullets}

# Reading discipline
- Prefer \`search_code\` with scoped queries over fetching every file.
- Use \`get_file_contents\` with a specific \`path\`. Never list the entire repo.
- Aim for under 15 file reads per audit.

# Findings format (mandatory)
Commit this exact structure to context/critics/${spec.scope}/findings.md on the target branch:

# Findings — Week $WEEK_DATE

## Issues identified
- [CRITICAL|HIGH|MEDIUM|LOW] <issue> — <evidence: file:line or quoted line>

## Patterns observed
- <recurring patterns across weeks>

## Out of scope
- [<scope-owner>] <issue outside ${spec.scope}>

Hard cap: 10 issues total.

# Severity rubric (${spec.scope}-tuned)
${spec.severity_rubric.trim()}

# Out-of-scope rule
Tag owner; do not claim or fix.

# Commit + push (GitHub MCP, not shell git)

1. Call \`create_branch\` owner=richsak, repo=webster, branch=$BRANCH, from_branch=main. If it returns 422 (branch exists), proceed.

2. Call \`get_file_contents\` owner=richsak, repo=webster, path=context/critics/${spec.scope}/findings.md, ref=$BRANCH. If it exists, capture the SHA. If 404, skip.

3. Call \`create_or_update_file\` with:
   - owner: richsak
   - repo: webster
   - branch: $BRANCH
   - path: context/critics/${spec.scope}/findings.md
   - content: the full findings.md body (starting with '# Findings — Week $WEEK_DATE')
   - message: 'chore(${spec.name}): week $WEEK_DATE findings'
   - sha: <from step 2 if the file existed; omit otherwise>

That single \`create_or_update_file\` call is both the commit and the push. No shell git required.
`;
}

export function spliceNewSpec(template: AgentJSON, spec: NewCriticSpec): AgentJSON {
  return {
    name: spec.name,
    description: spec.description,
    model: "claude-sonnet-4-6",
    system: buildSystemPrompt(spec),
    tools: structuredClone(template.tools),
    mcp_servers: template.mcp_servers ? structuredClone(template.mcp_servers) : undefined,
    metadata: { role: "critic", scope: spec.scope },
  };
}

async function findAgentByName(apiKey: string, name: string): Promise<string | null> {
  const res = await fetch(`${API}/agents`, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": VERSION,
      "anthropic-beta": BETA,
    },
  });
  if (!res.ok) {
    throw new Error(`agent list failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: { id: string; name: string }[] };
  const match = data.data?.find((a) => a.name === name);
  return match?.id ?? null;
}

async function registerAgent(apiKey: string, spec: AgentJSON): Promise<string> {
  const existing = await findAgentByName(apiKey, spec.name);
  if (existing) {
    console.log(`  agent ${spec.name} already registered: ${existing} — reusing`);
    return existing;
  }
  const res = await fetch(`${API}/agents`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": VERSION,
      "anthropic-beta": BETA,
      "content-type": "application/json",
    },
    body: JSON.stringify(spec),
  });
  if (!res.ok) {
    throw new Error(`agent registration failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error(`agent registration returned no id: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function createSession(
  apiKey: string,
  agentId: string,
  envId: string,
  title: string,
): Promise<string> {
  const res = await fetch(`${API}/sessions`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": VERSION,
      "anthropic-beta": BETA,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agent: agentId,
      environment_id: envId,
      vault_ids: [VAULT_ID],
      title,
    }),
  });
  if (!res.ok) {
    throw new Error(`session create failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new Error(`session create returned no id: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function sendUserMessage(apiKey: string, sessionId: string, text: string): Promise<void> {
  const res = await fetch(`${API}/sessions/${sessionId}/events`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": VERSION,
      "anthropic-beta": BETA,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      events: [{ type: "user.message", content: [{ type: "text", text }] }],
    }),
  });
  if (!res.ok) {
    throw new Error(`event send failed (${res.status}): ${await res.text()}`);
  }
}

async function pollUntilIdle(apiKey: string, sessionId: string): Promise<string> {
  const deadline = Date.now() + POLL_DEADLINE_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/sessions/${sessionId}`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": VERSION,
        "anthropic-beta": BETA,
      },
    });
    if (!res.ok) {
      throw new Error(`session status fetch failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { status?: string };
    const status = data.status ?? "unknown";
    console.log(`  session ${sessionId}: ${status} (${new Date().toISOString()})`);
    if (status === "idle" || status === "completed" || status === "stopped") {
      return status;
    }
    if (status === "failed" || status === "errored") {
      throw new Error(`session ended with status ${status}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`session ${sessionId} did not idle within ${POLL_DEADLINE_MS / 60_000}min`);
}

async function fetchSessionSnapshot(apiKey: string, sessionId: string): Promise<unknown> {
  const res = await fetch(`${API}/sessions/${sessionId}`, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": VERSION,
      "anthropic-beta": BETA,
    },
  });
  if (!res.ok) {
    return { error: `fetch failed ${res.status}`, body: await res.text() };
  }
  return res.json();
}

function writeArtifacts(
  weekDate: string,
  spec: AgentJSON,
  sessionSnapshot: unknown,
  rationale: string,
): { specPath: string; agentPath: string; logPath: string; dir: string } {
  const dir = join(ROOT, "history", weekDate, "genealogy");
  mkdirSync(dir, { recursive: true });
  const specPath = join(dir, "spec.json");
  const logPath = join(dir, "session.json");
  const rationalePath = join(dir, "rationale.md");
  const agentPath = join(ROOT, "agents", `${spec.name}.json`);
  writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
  writeFileSync(agentPath, JSON.stringify(spec, null, 2) + "\n");
  writeFileSync(logPath, JSON.stringify(sessionSnapshot, null, 2) + "\n");
  writeFileSync(rationalePath, `# Genealogy — week ${weekDate}\n\n${rationale.trim()}\n`);
  return { specPath, agentPath, logPath, dir };
}

function commitArtifacts(paths: string[], message: string): void {
  execFileSync("git", ["add", ...paths], { stdio: "inherit" });
  execFileSync("git", ["commit", "-m", message], { stdio: "inherit" });
}

async function main(): Promise<number> {
  const args = parseArgs(Bun.argv.slice(2));
  const apiKey = getAPIKey();
  const envId = loadEnvironmentId();

  const critics = loadExistingCritics();
  console.log(`existing critics: ${critics.map((c) => c.scope).join(", ")}`);

  const findings = args.fixtures
    ? loadFindingsFromFixtures(args.fixtures)
    : loadFindingsFromBranch(args.branch as string, critics);
  console.log(`findings loaded: ${[...findings.keys()].join(", ")}`);

  console.log("detecting gap (Opus 4.7)...");
  const gap = await detectGap(apiKey, critics, findings, args.lpTarget, args.weekDate);

  if (!gap.gap_found || !gap.new_critic) {
    console.log("no gap detected — council coverage is complete this week");
    return 0;
  }

  const newSpec = gap.new_critic;
  console.log(`gap found: ${newSpec.name} (scope: ${newSpec.scope})`);
  console.log(`rationale: ${newSpec.rationale}`);

  const dedupDecision = evaluateCriticDedup(newSpec, critics);
  if (!dedupDecision.allowed) {
    printDedupRejection(dedupDecision);
    return 0;
  }
  console.log(
    `dedup check passed: closest=${dedupDecision.closestCritic?.name ?? "none"} similarity=${dedupDecision.similarity.toFixed(3)}`,
  );

  const capDecision = evaluateQuarterlyCap(
    join(ROOT, "history"),
    args.weekDate,
    args.overrideQuarterlyCap,
  );
  if (!capDecision.allowed) {
    printQuarterlyCapBlock(capDecision);
    return 0;
  }
  if (capDecision.overrideUsed) {
    console.warn(
      `OPERATOR OVERRIDE: allowing genealogy spawn despite ${capDecision.recentSpawnCount} spawns in ${capDecision.windowStart}..${capDecision.windowEnd}.`,
    );
  } else {
    console.log(
      `quarterly cap check passed: ${capDecision.recentSpawnCount}/${QUARTERLY_CAP_MAX_SPAWNS} spawns in ${capDecision.windowStart}..${capDecision.windowEnd}`,
    );
  }

  const templateRaw = readFileSync(join(ROOT, TEMPLATE_PATH), "utf8");
  const template = JSON.parse(templateRaw) as AgentJSON;
  const spec = spliceNewSpec(template, newSpec);

  if (args.dryRun) {
    console.log("--- DRY RUN: would register this spec ---");
    console.log(JSON.stringify(spec, null, 2));
    console.log("--- DRY RUN: skipping registration, session, commit ---");
    return 0;
  }

  console.log(`registering agent ${spec.name}...`);
  const agentId = await registerAgent(apiKey, spec);
  console.log(`  agent id: ${agentId}`);

  const branch = args.branch ?? `council/${args.weekDate}`;
  const userMessage = `BRANCH=${branch}
WEEK_DATE=${args.weekDate}
LP_TARGET=${args.lpTarget}`;

  console.log(`creating session for ${spec.name}...`);
  const sessionId = await createSession(
    apiKey,
    agentId,
    envId,
    `${spec.name} — genealogy ${args.weekDate}`,
  );
  console.log(`  session id: ${sessionId}`);

  await sendUserMessage(apiKey, sessionId, userMessage);
  console.log("user.message sent, polling status...");

  const finalStatus = await pollUntilIdle(apiKey, sessionId);
  console.log(`session final status: ${finalStatus}`);

  const snapshot = await fetchSessionSnapshot(apiKey, sessionId);
  const paths = writeArtifacts(args.weekDate, spec, snapshot, newSpec.rationale);

  const commitMsg = `feat(genealogy): spawn ${spec.name} — week ${args.weekDate}

${newSpec.rationale}

Agent ID: ${agentId}
Session ID: ${sessionId}
Final status: ${finalStatus}`;
  commitArtifacts(
    [paths.specPath, paths.agentPath, paths.logPath, join(paths.dir, "rationale.md")],
    commitMsg,
  );
  console.log(`committed: ${paths.specPath}, ${paths.agentPath}, ${paths.logPath}`);
  console.log(`genealogy complete: ${spec.name} — history/${args.weekDate}/genealogy/`);
  return 0;
}

if (import.meta.main) {
  try {
    const code = await main();
    process.exit(code);
  } catch (err) {
    if (err instanceof CLIError) {
      if (err.message === "help") {
        printUsage();
        process.exit(0);
      }
      console.error(`ERROR: ${err.message}`);
      printUsage();
      process.exit(2);
    }
    const e = err as Error;
    console.error(`FAIL: ${e.message}`);
    process.exit(1);
  }
}

// Exported for tests.
export {
  CLIError,
  buildGapPrompt,
  buildSystemPrompt,
  cosineSimilarity,
  countRecentGenealogySpawns,
  evaluateCriticDedup,
  evaluateQuarterlyCap,
  loadExistingCritics,
  parseArgs,
  type AgentJSON,
  type CLIArgs,
  type CriticSummary,
  type DedupDecision,
  type EmbeddingFn,
  type EmbeddingVector,
  type GapResponse,
  type NewCriticSpec,
  type QuarterlyCapDecision,
};
