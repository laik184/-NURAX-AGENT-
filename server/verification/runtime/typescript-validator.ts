/**
 * typescript-validator.ts
 *
 * Scan recent log lines for TypeScript compile errors.
 *
 * Detects patterns like:
 *   - "error TS2345: Argument of type..."
 *   - "error TS2307: Cannot find module..."
 *   - "Type 'X' is not assignable to type 'Y'"
 *   - "Property 'X' does not exist on type 'Y'"
 *
 * Ownership: verification/runtime — TS error detection only. Pure, no I/O.
 */

import { logBuffer }        from "../../runtime/observer/log-buffer.ts";
import type { CheckResult } from "../types.ts";

// ─── Patterns ─────────────────────────────────────────────────────────────────

const TS_ERROR_PATTERNS: RegExp[] = [
  /error TS\d+:/i,
  /typescript.*error/i,
  /type '\S+' is not assignable/i,
  /property '\S+' does not exist on type/i,
  /cannot find module/i,
  /does not satisfy the constraint/i,
  /has no exported member/i,
  /argument of type '\S+' is not assignable/i,
  /object is possibly 'undefined'/i,
  /object is possibly 'null'/i,
  /compilation.*failed/i,
  /\berror\b.*\.ts\(\d+,\d+\)/i,
];

const LOG_TAIL = 80;

// ─── Validator ────────────────────────────────────────────────────────────────

export async function checkTypeScript(projectId: number): Promise<CheckResult> {
  const lines = logBuffer.tail(projectId, LOG_TAIL);
  const tsErrors: string[] = [];

  for (const { text } of lines) {
    if (TS_ERROR_PATTERNS.some(p => p.test(text))) {
      tsErrors.push(text.slice(0, 200));
      if (tsErrors.length >= 5) break; // cap
    }
  }

  if (tsErrors.length === 0) {
    return {
      name:    "typescript_errors",
      status:  "passed",
      message: "No TypeScript compile errors detected in recent logs.",
    };
  }

  return {
    name:    "typescript_errors",
    status:  "failed",
    message: `${tsErrors.length} TypeScript error(s) detected.`,
    detail:  `Errors:\n${tsErrors.map(e => `  • ${e}`).join("\n")}\nFix these type errors and restart the server.`,
  };
}
