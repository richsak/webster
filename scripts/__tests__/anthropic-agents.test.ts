import { afterEach, describe, expect, test } from "bun:test";
import { findAgentByName } from "../anthropic-agents.ts";

const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("findAgentByName", () => {
  test("walks last_id paginated agent results and finds a name on page 2", async () => {
    const urls: string[] = [];
    const responses = [
      jsonResponse({
        data: [{ id: "agent-1", name: "first-agent" }],
        has_more: true,
        last_id: "agent-1",
      }),
      jsonResponse({ data: [{ id: "agent-2", name: "target-agent" }], has_more: false }),
    ];

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      urls.push(String(input));
      const response = responses.shift();
      if (!response) {
        throw new Error(`unexpected fetch: ${String(input)}`);
      }
      return response;
    }) as typeof fetch;

    await expect(findAgentByName("test-key", "target-agent")).resolves.toBe("agent-2");
    expect(urls).toEqual([
      "https://api.anthropic.com/v1/agents",
      "https://api.anthropic.com/v1/agents?after_id=agent-1",
    ]);
  });

  test("walks next_page path values without duplicating the v1 prefix", async () => {
    const urls: string[] = [];
    const responses = [
      jsonResponse({
        data: [{ id: "agent-1", name: "first-agent" }],
        next_page: "/v1/agents?after_id=agent-1",
      }),
      jsonResponse({ data: [{ id: "agent-2", name: "target-agent" }], has_more: false }),
    ];

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      urls.push(String(input));
      const response = responses.shift();
      if (!response) {
        throw new Error(`unexpected fetch: ${String(input)}`);
      }
      return response;
    }) as typeof fetch;

    await expect(findAgentByName("test-key", "target-agent")).resolves.toBe("agent-2");
    expect(urls).toEqual([
      "https://api.anthropic.com/v1/agents",
      "https://api.anthropic.com/v1/agents?after_id=agent-1",
    ]);
  });

  test("walks opaque next_page tokens using the page query parameter", async () => {
    const urls: string[] = [];
    const responses = [
      jsonResponse({
        data: [{ id: "agent-1", name: "first-agent" }],
        next_page: "page_opaqueToken",
      }),
      jsonResponse({ data: [{ id: "agent-2", name: "target-agent" }] }),
    ];

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      urls.push(String(input));
      const response = responses.shift();
      if (!response) {
        throw new Error(`unexpected fetch: ${String(input)}`);
      }
      return response;
    }) as typeof fetch;

    await expect(findAgentByName("test-key", "target-agent")).resolves.toBe("agent-2");
    expect(urls).toEqual([
      "https://api.anthropic.com/v1/agents",
      "https://api.anthropic.com/v1/agents?page=page_opaqueToken",
    ]);
  });
});
