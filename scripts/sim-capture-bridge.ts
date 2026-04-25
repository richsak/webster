#!/usr/bin/env bun

export interface CaptureTriggerLine {
  event: "CAPTURE_TRIGGER";
  substrate: "lp" | "site";
  week: 1 | 5 | 10;
  output: string;
  console_url: string;
}

export interface BridgeDeps {
  spawnCapture?: (payload: CaptureTriggerLine) => Promise<void>;
  writeStdout?: (line: string) => void;
}

function isCaptureTrigger(value: unknown): value is CaptureTriggerLine {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<CaptureTriggerLine>;
  return (
    candidate.event === "CAPTURE_TRIGGER" &&
    (candidate.substrate === "lp" || candidate.substrate === "site") &&
    (candidate.week === 1 || candidate.week === 5 || candidate.week === 10) &&
    typeof candidate.output === "string" &&
    typeof candidate.console_url === "string"
  );
}

export function parseCaptureTriggerLine(line: string): CaptureTriggerLine | null {
  try {
    const parsed = JSON.parse(line) as unknown;
    return isCaptureTrigger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function defaultSpawnCapture(payload: CaptureTriggerLine): Promise<void> {
  const proc = Bun.spawn(["bun", "scripts/capture-mem-stores.ts", JSON.stringify(payload)], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`capture failed for ${payload.substrate} week ${payload.week}`);
  }
}

export async function processBridgeInput(input: string, deps: BridgeDeps = {}): Promise<void> {
  const spawnCapture = deps.spawnCapture ?? defaultSpawnCapture;
  const writeStdout = deps.writeStdout ?? ((line: string) => process.stdout.write(line));
  const lines = input.split(/(?<=\n)/).filter((line) => line.length > 0);
  for (const rawLine of lines) {
    writeStdout(rawLine);
    const line = rawLine.endsWith("\n") ? rawLine.slice(0, -1) : rawLine;
    const trigger = parseCaptureTriggerLine(line);
    if (trigger) {
      await spawnCapture(trigger);
    }
  }
}

async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(chunk);
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

if (import.meta.main) {
  try {
    await processBridgeInput(await readStdin());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
