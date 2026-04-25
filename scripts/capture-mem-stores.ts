#!/usr/bin/env bun

import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { dirname } from "node:path";

export interface CaptureTriggerPayload {
  event?: string;
  substrate: "lp" | "site";
  week: 1 | 5 | 10;
  output: string;
  console_url: string;
}

export interface CaptureDeps {
  run?: (command: string[]) => { exitCode: number; stdout: string; stderr: string };
  stat?: (path: string) => { size: number };
}

const AUTH_MARKERS = [
  "continue with google",
  "continue with email",
  "console login",
  "log in",
  "sign in",
];
const MEMORY_MARKERS = ["memory stores", "memory", "stores"];

function decode(value: Uint8Array | string | null | undefined): string {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return new TextDecoder().decode(value);
}

function defaultRun(command: string[]): { exitCode: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(command[0] ?? "", command.slice(1), {
      encoding: "utf8",
      timeout: 30_000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as {
      status?: number;
      stdout?: string | Uint8Array;
      stderr?: string | Uint8Array;
    };
    return {
      exitCode: err.status ?? 1,
      stdout: decode(err.stdout),
      stderr: decode(err.stderr),
    };
  }
}

function parsePayload(raw: string): CaptureTriggerPayload {
  const parsed = JSON.parse(raw) as Partial<CaptureTriggerPayload>;
  if (parsed.event && parsed.event !== "CAPTURE_TRIGGER") {
    throw new Error(`unsupported event: ${parsed.event}`);
  }
  if (parsed.substrate !== "lp" && parsed.substrate !== "site") {
    throw new Error("payload.substrate must be lp or site");
  }
  if (parsed.week !== 1 && parsed.week !== 5 && parsed.week !== 10) {
    throw new Error("payload.week must be 1, 5, or 10");
  }
  if (!parsed.output) {
    throw new Error("payload.output is required");
  }
  if (!parsed.console_url) {
    throw new Error("payload.console_url is required");
  }
  return {
    event: parsed.event,
    substrate: parsed.substrate,
    week: parsed.week,
    output: parsed.output,
    console_url: parsed.console_url,
  };
}

function isAuthExpired(pageText: string, screenshotSize: number): boolean {
  const lower = pageText.toLowerCase();
  return screenshotSize < 100_000 || AUTH_MARKERS.some((marker) => lower.includes(marker));
}

function hasMemoryStoreEvidence(pageText: string): boolean {
  const lower = pageText.toLowerCase();
  return MEMORY_MARKERS.every((marker) => lower.includes(marker));
}

export async function captureMemoryStores(
  payload: CaptureTriggerPayload,
  deps: CaptureDeps = {},
): Promise<void> {
  const run = deps.run ?? defaultRun;
  const stat = deps.stat ?? ((path: string) => statSync(path));
  mkdirSync(dirname(payload.output), { recursive: true });

  const open = run([
    "browser-use",
    "-b",
    "real",
    "--profile",
    "Default",
    "open",
    payload.console_url,
  ]);
  if (open.exitCode !== 0) {
    throw new Error(`browser open failed: ${open.stderr || open.stdout}`.trim());
  }

  const screenshot = run([
    "browser-use",
    "-b",
    "real",
    "--profile",
    "Default",
    "screenshot",
    payload.output,
  ]);
  if (screenshot.exitCode !== 0) {
    throw new Error(`browser screenshot failed: ${screenshot.stderr || screenshot.stdout}`.trim());
  }

  const state = run(["browser-use", "-b", "real", "--profile", "Default", "state"]);
  if (state.exitCode !== 0) {
    throw new Error(`browser state extraction failed: ${state.stderr || state.stdout}`.trim());
  }

  const size = stat(payload.output).size;
  if (isAuthExpired(state.stdout, size)) {
    throw new Error(
      "AUTH_EXPIRED: Anthropic Console is not authenticated or screenshot is too small",
    );
  }
  if (!hasMemoryStoreEvidence(state.stdout)) {
    throw new Error(
      "capture verification failed: page text does not contain Memory Stores evidence",
    );
  }
}

if (import.meta.main) {
  const raw = Bun.argv[2];
  if (!raw) {
    console.error("Usage: bun scripts/capture-mem-stores.ts '<CAPTURE_TRIGGER json>'");
    process.exit(2);
  }
  try {
    await captureMemoryStores(parsePayload(raw));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { hasMemoryStoreEvidence, isAuthExpired, parsePayload };
