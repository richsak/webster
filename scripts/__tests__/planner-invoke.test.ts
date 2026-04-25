import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invokePlanner } from "../planner-invoke.ts";

const ORIGINAL_FETCH = globalThis.fetch;

function buildHistoryDir(testName: string): string {
  return join(tmpdir(), `planner-invoke-${testName}-${Date.now()}-${randomUUID()}`, "history");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetchMock(responses: Response[]): string[] {
  const urls: string[] = [];
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
    urls.push(String(input));
    const response = responses.shift();
    if (!response) {
      throw new Error(`unexpected fetch: ${String(input)}`);
    }
    return response;
  }) as typeof fetch;
  return urls;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("invokePlanner", () => {
  test("writes plan markdown and appends a verdict-ready memory event", async () => {
    const historyDir = buildHistoryDir("happy");
    const planJson = {
      classification: "promising",
      next_action: "promote_and_experiment",
      direction_hint: "Tighten first-scroll proof before testing pricing copy.",
      rationale: "The last verdict promoted hero clarity, so the next week should compound it.",
    } as const;
    const urls = installFetchMock([
      jsonResponse({ data: [{ id: "agent-123", name: "webster-planner" }] }),
      jsonResponse({ id: "session-123" }),
      jsonResponse({ ok: true }),
      jsonResponse({
        status: "idle",
        events: [
          { type: "user.message", content: [{ type: "text", text: "context" }] },
          {
            type: "assistant.message",
            content: [{ type: "text", text: JSON.stringify(planJson) }],
          },
        ],
      }),
    ]);

    try {
      const result = await invokePlanner({
        contextText: "planner context",
        week: "2026-W17",
        historyDir,
        apiKey: "test-key",
      });

      expect(urls).toEqual([
        "https://api.anthropic.com/v1/agents",
        "https://api.anthropic.com/v1/sessions",
        "https://api.anthropic.com/v1/sessions/session-123/events",
        "https://api.anthropic.com/v1/sessions/session-123",
      ]);
      expect(result.plan).toEqual(planJson);
      expect(result.planPath).toBe(join(historyDir, "2026-W17", "plan.md"));

      const planText = readFileSync(result.planPath, "utf8");
      expect(planText).toContain("# Planner plan — 2026-W17");
      expect(planText).toContain("- Next action: promote_and_experiment");
      expect(planText).toContain("```json");
      expect(planText).toContain(
        '"direction_hint": "Tighten first-scroll proof before testing pricing copy."',
      );

      const memoryRows = readFileSync(join(historyDir, "memory.jsonl"), "utf8").trim().split("\n");
      expect(memoryRows).toHaveLength(1);
      const event = JSON.parse(memoryRows[0] ?? "{}");
      expect(event).toMatchObject({
        week: "2026-W17",
        actor: "planner",
        event: "verdict-ready",
        refs: { plan: "history/2026-W17/plan.md" },
        insight: planJson.rationale,
      });
    } finally {
      rmSync(join(historyDir, ".."), { recursive: true, force: true });
    }
  });

  test("rejects malformed planner JSON without writing plan or memory", async () => {
    const historyDir = buildHistoryDir("malformed");
    installFetchMock([
      jsonResponse({ data: [{ id: "agent-123", name: "webster-planner" }] }),
      jsonResponse({ id: "session-123" }),
      jsonResponse({ ok: true }),
      jsonResponse({
        status: "idle",
        events: [{ type: "assistant.message", content: [{ type: "text", text: "not-json" }] }],
      }),
    ]);

    try {
      await expect(
        invokePlanner({
          contextText: "planner context",
          week: "2026-W17",
          historyDir,
          apiKey: "test-key",
        }),
      ).rejects.toThrow("planner returned invalid JSON");

      expect(existsSync(join(historyDir, "2026-W17", "plan.md"))).toBe(false);
      expect(existsSync(join(historyDir, "memory.jsonl"))).toBe(false);
    } finally {
      rmSync(join(historyDir, ".."), { recursive: true, force: true });
    }
  });

  test("rejects unknown next_action without append side effects", async () => {
    const historyDir = buildHistoryDir("unknown-action");
    installFetchMock([
      jsonResponse({ data: [{ id: "agent-123", name: "webster-planner" }] }),
      jsonResponse({ id: "session-123" }),
      jsonResponse({ ok: true }),
      jsonResponse({
        status: "idle",
        events: [
          {
            type: "assistant.message",
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  classification: "risky",
                  next_action: "invent_action",
                  direction_hint: "Do something else.",
                  rationale: "Invalid action should fail closed.",
                }),
              },
            ],
          },
        ],
      }),
    ]);

    try {
      await expect(
        invokePlanner({
          contextText: "planner context",
          week: "2026-W17",
          historyDir,
          apiKey: "test-key",
        }),
      ).rejects.toThrow("unknown next_action");

      expect(existsSync(join(historyDir, "2026-W17", "plan.md"))).toBe(false);
      expect(existsSync(join(historyDir, "memory.jsonl"))).toBe(false);
    } finally {
      rmSync(join(historyDir, ".."), { recursive: true, force: true });
    }
  });
});
