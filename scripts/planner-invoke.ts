import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { appendEvent } from "./memory.ts";

const API_BASE = process.env.ANTHROPIC_API_BASE ?? "https://api.anthropic.com";
const API = `${API_BASE.replace(/\/$/, "")}/v1`;
const BETA = "managed-agents-2026-04-01";
const VERSION = "2023-06-01";
const POLL_INTERVAL_MS = 30_000;
const POLL_DEADLINE_MS = 20 * 60 * 1000;
const PLANNER_NAME = "webster-planner";
const PLANNER_SPEC_PATH = "agents/webster-planner.json";
const ENVIRONMENT_ID_PATH = "environments/webster-council-env.id";

const NEXT_ACTIONS = [
  "promote_and_experiment",
  "hold_baseline",
  "revert_and_retry",
  "explore_broadly",
] as const;

type NextAction = (typeof NEXT_ACTIONS)[number];

export interface PlanRecord {
  classification: string;
  next_action: NextAction;
  direction_hint: string;
  new_critic_request?: unknown;
  rationale: string;
}

export interface InvokePlannerOptions {
  contextText: string;
  week: string;
  historyDir: string;
  apiKey: string;
}

interface AgentJSON {
  name: string;
  description?: string;
  model: string;
  system: string;
  tools?: unknown[];
  mcp_servers?: unknown[];
  metadata?: Record<string, string>;
}

function headers(apiKey: string, withContentType = false): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "anthropic-version": VERSION,
    "anthropic-beta": BETA,
    ...(withContentType ? { "content-type": "application/json" } : {}),
  };
}

async function findAgentByName(apiKey: string, name: string): Promise<string | null> {
  const res = await fetch(`${API}/agents`, { headers: headers(apiKey) });
  if (!res.ok) {
    throw new Error(`agent list failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { data?: { id: string; name: string }[] };
  const match = data.data?.find((agent) => agent.name === name);
  return match?.id ?? null;
}

function loadPlannerSpec(): AgentJSON {
  if (!existsSync(PLANNER_SPEC_PATH)) {
    throw new Error(`planner spec missing at ${PLANNER_SPEC_PATH}`);
  }

  return JSON.parse(readFileSync(PLANNER_SPEC_PATH, "utf8")) as AgentJSON;
}

function loadEnvironmentId(): string {
  if (!existsSync(ENVIRONMENT_ID_PATH)) {
    throw new Error(`environment id missing at ${ENVIRONMENT_ID_PATH}`);
  }

  const envId = readFileSync(ENVIRONMENT_ID_PATH, "utf8").trim();
  if (!envId.startsWith("env_")) {
    throw new Error(`environment id malformed: ${envId}`);
  }
  return envId;
}

async function registerAgent(apiKey: string): Promise<string> {
  const existing = await findAgentByName(apiKey, PLANNER_NAME);
  if (existing) {
    return existing;
  }

  const spec = loadPlannerSpec();
  if (spec.name !== PLANNER_NAME) {
    throw new Error(`planner spec name must be ${PLANNER_NAME}, got ${spec.name}`);
  }

  const res = await fetch(`${API}/agents`, {
    method: "POST",
    headers: headers(apiKey, true),
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
  week: string,
): Promise<string> {
  const res = await fetch(`${API}/sessions`, {
    method: "POST",
    headers: headers(apiKey, true),
    body: JSON.stringify({
      agent: agentId,
      environment_id: envId,
      title: `Webster planner ${week}`,
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
    headers: headers(apiKey, true),
    body: JSON.stringify({
      events: [{ type: "user.message", content: [{ type: "text", text }] }],
    }),
  });
  if (!res.ok) {
    throw new Error(`event send failed (${res.status}): ${await res.text()}`);
  }
}

async function fetchSessionSnapshot(apiKey: string, sessionId: string): Promise<unknown> {
  const res = await fetch(`${API}/sessions/${sessionId}`, { headers: headers(apiKey) });
  if (!res.ok) {
    throw new Error(`session status fetch failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

function readStatus(snapshot: unknown): string {
  if (typeof snapshot === "object" && snapshot !== null && "status" in snapshot) {
    const status = (snapshot as { status?: unknown }).status;
    if (typeof status === "string") {
      return status;
    }
  }
  return "unknown";
}

async function pollUntilIdle(apiKey: string, sessionId: string): Promise<unknown> {
  const deadline = Date.now() + POLL_DEADLINE_MS;
  while (Date.now() < deadline) {
    const snapshot = await fetchSessionSnapshot(apiKey, sessionId);
    const status = readStatus(snapshot);
    if (status === "idle" || status === "completed" || status === "stopped") {
      return snapshot;
    }
    if (status === "failed" || status === "errored") {
      throw new Error(`session ended with status ${status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`session ${sessionId} did not idle within ${POLL_DEADLINE_MS / 60_000}min`);
}

function textFromContent(content: unknown): string[] {
  if (!Array.isArray(content)) {
    return [];
  }

  return content.flatMap((part) => {
    if (typeof part === "object" && part !== null && "text" in part) {
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? [text] : [];
    }
    return [];
  });
}

function extractFinalAssistantText(snapshot: unknown): string {
  if (typeof snapshot !== "object" || snapshot === null || !("events" in snapshot)) {
    throw new Error("planner session snapshot did not include events");
  }

  const events = (snapshot as { events?: unknown }).events;
  if (!Array.isArray(events)) {
    throw new Error("planner session events were not an array");
  }

  const assistantTexts = events.flatMap((event) => {
    if (typeof event !== "object" || event === null) {
      return [];
    }
    const typedEvent = event as { type?: unknown; content?: unknown };
    if (typedEvent.type !== "assistant.message") {
      return [];
    }
    return textFromContent(typedEvent.content);
  });

  const text = assistantTexts.at(-1)?.trim();
  if (!text) {
    throw new Error("planner session did not return assistant text");
  }
  return text;
}

function parsePlanRecord(text: string): PlanRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`planner returned invalid JSON: ${(error as Error).message}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("planner JSON must be an object");
  }

  const record = parsed as Partial<PlanRecord>;
  if (typeof record.classification !== "string" || record.classification.length === 0) {
    throw new Error("planner JSON missing required string field classification");
  }
  if (!NEXT_ACTIONS.includes(record.next_action as NextAction)) {
    throw new Error(`planner JSON has unknown next_action: ${String(record.next_action)}`);
  }
  if (typeof record.direction_hint !== "string" || record.direction_hint.length === 0) {
    throw new Error("planner JSON missing required string field direction_hint");
  }
  if (typeof record.rationale !== "string" || record.rationale.length === 0) {
    throw new Error("planner JSON missing required string field rationale");
  }

  return {
    classification: record.classification,
    next_action: record.next_action as NextAction,
    direction_hint: record.direction_hint,
    ...(record.new_critic_request === undefined
      ? {}
      : { new_critic_request: record.new_critic_request }),
    rationale: record.rationale,
  };
}

function renderPlanMarkdown(week: string, plan: PlanRecord): string {
  return [
    `# Planner plan — ${week}`,
    "",
    `- Classification: ${plan.classification}`,
    `- Next action: ${plan.next_action}`,
    `- Direction hint: ${plan.direction_hint}`,
    `- New critic request: ${
      plan.new_critic_request === undefined ? "none" : JSON.stringify(plan.new_critic_request)
    }`,
    `- Rationale: ${plan.rationale}`,
    "",
    "```json",
    JSON.stringify(plan, null, 2),
    "```",
    "",
  ].join("\n");
}

export async function invokePlanner(
  opts: InvokePlannerOptions,
): Promise<{ planPath: string; plan: PlanRecord }> {
  const agentId = await registerAgent(opts.apiKey);
  const envId = loadEnvironmentId();
  const sessionId = await createSession(opts.apiKey, agentId, envId, opts.week);
  await sendUserMessage(opts.apiKey, sessionId, opts.contextText);
  const snapshot = await pollUntilIdle(opts.apiKey, sessionId);
  const plan = parsePlanRecord(extractFinalAssistantText(snapshot));

  const weekDir = join(opts.historyDir, opts.week);
  const planPath = join(weekDir, "plan.md");
  const relativePlanPath = join(basename(opts.historyDir), opts.week, "plan.md");

  mkdirSync(weekDir, { recursive: true });
  writeFileSync(planPath, renderPlanMarkdown(opts.week, plan));
  appendEvent(
    {
      ts: new Date().toISOString(),
      week: opts.week,
      actor: "planner",
      event: "verdict-ready",
      refs: { plan: relativePlanPath },
      insight: plan.rationale,
    },
    join(opts.historyDir, "memory.jsonl"),
  );

  return { planPath, plan };
}
