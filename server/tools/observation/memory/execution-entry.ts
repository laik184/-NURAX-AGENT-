/**
 * server/tools/observation/memory/execution-entry.ts
 *
 * Single execution record stored in per-run memory.
 * Enables the AI to recall what it has tried, what failed, and why.
 */

import type { FailureClass, ActionRecommendation } from "../types.ts";

export interface ExecutionEntry {
  readonly seq:         number;           // call sequence in the run
  readonly toolName:    string;
  readonly ok:          boolean;
  readonly failureClass: FailureClass | null;
  readonly errorSnippet: string | null;   // first 200 chars of error
  readonly durationMs:  number;
  readonly recommendation: ActionRecommendation;
  readonly ts:          number;
}

export interface RunMemorySummary {
  totalCalls:   number;
  failedCalls:  number;
  failedTools:  string[];
  recentErrors: string[];
  loopDetected: boolean;   // same tool failing >2 times in a row
}

/** Compact text the AI can read to understand what it has tried. */
export function formatMemorySummary(summary: RunMemorySummary): string {
  if (summary.totalCalls === 0) return "";

  const parts: string[] = [
    `[EXECUTION MEMORY] ${summary.totalCalls} calls, ${summary.failedCalls} failures so far.`,
  ];

  if (summary.failedTools.length > 0) {
    parts.push(`Failed tools: ${summary.failedTools.join(", ")}`);
  }
  if (summary.recentErrors.length > 0) {
    parts.push("Recent errors:");
    summary.recentErrors.forEach((e) => parts.push(`  • ${e}`));
  }
  if (summary.loopDetected) {
    parts.push("⚠️  LOOP DETECTED: Same tool is failing repeatedly. Change approach.");
  }

  return parts.join("\n");
}
