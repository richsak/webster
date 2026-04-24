import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { tailN as readMemoryTail, type MemoryEvent } from "./memory.ts";

export interface PlannerContextOptions {
  memoryPath: string;
  verdictDir: string;
  monitorPath: string;
  tailN?: number;
}

const DEFAULT_TAIL_N = 50;
const COLD_START =
  "COLD_START: no prior planner memory, verdicts, or monitor anomalies were available.";

function formatMemoryTail(events: MemoryEvent[]): string {
  if (events.length === 0) {
    return "No memory events found.";
  }

  return events.map((event) => JSON.stringify(event)).join("\n");
}

function readRecentVerdicts(verdictDir: string): string[] {
  if (!existsSync(verdictDir)) {
    return [];
  }

  return readdirSync(verdictDir)
    .filter((entry) => {
      const weekPath = join(verdictDir, entry);
      return statSync(weekPath).isDirectory() && existsSync(join(weekPath, "verdict.json"));
    })
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 2)
    .map((week) => {
      const verdictPath = join(verdictDir, week, "verdict.json");
      return `### ${week}\n${readFileSync(verdictPath, "utf8").trim()}`;
    });
}

function readMonitorAnomalies(monitorPath: string): string {
  if (!existsSync(monitorPath)) {
    return "";
  }

  return readFileSync(monitorPath, "utf8").trim();
}

export function marshalPlannerContext(opts: PlannerContextOptions): string {
  const memoryEvents = readMemoryTail(opts.tailN ?? DEFAULT_TAIL_N, opts.memoryPath);
  const verdicts = readRecentVerdicts(opts.verdictDir);
  const monitorAnomalies = readMonitorAnomalies(opts.monitorPath);
  const isColdStart =
    memoryEvents.length === 0 && verdicts.length === 0 && monitorAnomalies.length === 0;

  return [
    "## MEMORY_TAIL",
    formatMemoryTail(memoryEvents),
    "",
    "## RECENT_VERDICTS",
    verdicts.length > 0 ? verdicts.join("\n\n") : "No recent verdicts found.",
    "",
    "## MONITOR_ANOMALIES",
    monitorAnomalies.length > 0 ? monitorAnomalies : "No monitor anomalies found.",
    ...(isColdStart ? ["", COLD_START] : []),
  ].join("\n");
}
