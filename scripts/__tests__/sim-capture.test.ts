import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureMemoryStores, isAuthExpired, parsePayload } from "../capture-mem-stores.ts";
import { buildMemoryScreenshotManifest } from "../emit-memory-screenshot-manifest.ts";
import { parseCaptureTriggerLine, processBridgeInput } from "../sim-capture-bridge.ts";

describe("memory store capture", () => {
  test("parses the locked CAPTURE_TRIGGER payload", () => {
    expect(
      parsePayload(
        JSON.stringify({
          event: "CAPTURE_TRIGGER",
          substrate: "lp",
          week: 5,
          output: "assets/memory-stores-screenshots/lp/week-5.png",
          console_url: "https://console.anthropic.com/settings/memory-stores",
        }),
      ),
    ).toMatchObject({ substrate: "lp", week: 5 });
  });

  test("detects auth-expired console captures", () => {
    expect(isAuthExpired("Continue with Google\nContinue with email", 200_000)).toBe(true);
    expect(isAuthExpired("Memory Stores\nStores", 120_000)).toBe(false);
  });

  test("fails with AUTH_EXPIRED when screenshot is a login page", async () => {
    const dir = join(tmpdir(), `webster-capture-${Date.now()}`);
    const output = join(dir, "week-1.png");
    await expect(
      captureMemoryStores(
        {
          event: "CAPTURE_TRIGGER",
          substrate: "lp",
          week: 1,
          output,
          console_url: "https://console.anthropic.com/settings/memory-stores",
        },
        {
          run: (command) => {
            if (command.includes("get")) {
              return { exitCode: 0, stdout: "Continue with Google", stderr: "" };
            }
            return { exitCode: 0, stdout: "", stderr: "" };
          },
          stat: () => ({ size: 50_000 }),
        },
      ),
    ).rejects.toThrow("AUTH_EXPIRED");
  });
});

describe("simulation capture bridge", () => {
  test("passes through all lines and spawns capture for triggers", async () => {
    const seen: string[] = [];
    const triggers: string[] = [];
    await processBridgeInput(
      `before\n${JSON.stringify({ event: "CAPTURE_TRIGGER", substrate: "site", week: 10, output: "assets/memory-stores-screenshots/site/week-10.png", console_url: "https://console.anthropic.com/settings/memory-stores" })}\nafter\n`,
      {
        writeStdout: (line) => seen.push(line),
        spawnCapture: async (payload) => {
          triggers.push(`${payload.substrate}:${payload.week}`);
        },
      },
    );

    expect(seen.join("")).toContain("before\n");
    expect(seen.join("")).toContain("after\n");
    expect(triggers).toEqual(["site:10"]);
  });

  test("ignores non-json log lines", () => {
    expect(parseCaptureTriggerLine("plain log line")).toBeNull();
  });
});

describe("memory screenshot manifest", () => {
  test("indexes available week 1/5/10 screenshots", () => {
    const root = join(tmpdir(), `webster-memshots-${Date.now()}`);
    mkdirSync(join(root, "lp"), { recursive: true });
    writeFileSync(join(root, "lp", "week-1.png"), "png");
    const manifest = buildMemoryScreenshotManifest(root);

    mkdirSync(join(root, "manual"), { recursive: true });
    writeFileSync(join(root, "manual", "console.png"), "manual-png");
    const withManual = buildMemoryScreenshotManifest(root);

    expect(manifest.screenshots).toHaveLength(1);
    expect(manifest.screenshots[0]).toMatchObject({ substrate: "lp", week: 1, bytes: 3 });
    expect(withManual.manual_proof[0]).toMatchObject({
      substrate: "manual",
      week: null,
      bytes: 10,
    });
    expect(() => buildMemoryScreenshotManifest(root, { requireComplete: true })).toThrow(
      "missing memory screenshots",
    );
  });
});
