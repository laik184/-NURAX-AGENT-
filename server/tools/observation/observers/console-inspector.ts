/**
 * server/tools/observation/observers/console-inspector.ts
 *
 * Reads the log-buffer and returns console lines captured AFTER a tool started.
 * Provides error filtering so the AI sees the most relevant output first.
 *
 * Single responsibility: log-buffer → structured console snapshot.
 */

import { logBuffer } from "../../../runtime/observer/log-buffer.ts";

export interface ConsoleSnapshot {
  allLines:   string[];
  errorLines: string[];
  hasErrors:  boolean;
}

// ── Patterns that identify error/warning lines ───────────────────────────────

const ERROR_PATTERNS = [
  /error/i,
  /\bfail/i,
  /exception/i,
  /crash/i,
  /\bfatal/i,
  /warn/i,
  /ENOENT|EACCES|EADDRINUSE|ECONNREFUSED|MODULE_NOT_FOUND/,
  /error TS\d+:/i,
  /\(\d+,\d+\): error/,
  /SyntaxError/,
  /TypeError/,
  /ReferenceError/,
];

function isErrorLine(line: string): boolean {
  return ERROR_PATTERNS.some((p) => p.test(line));
}

/**
 * Capture console lines after a given timestamp.
 * Prioritises stderr lines and error patterns.
 */
export function inspectConsole(projectId: number, afterTs: number, maxLines = 20): ConsoleSnapshot {
  const buffered = logBuffer.since(projectId, afterTs);

  // Prioritise stderr first, then error-matching stdout
  const errorLines = buffered
    .filter((l) => l.stream === "stderr" || isErrorLine(l.text))
    .map((l) => l.text.trimEnd())
    .slice(-maxLines);

  const allLines = buffered
    .map((l) => `${l.stream === "stderr" ? "[err]" : "[out]"} ${l.text.trimEnd()}`)
    .slice(-maxLines);

  return {
    allLines,
    errorLines,
    hasErrors: errorLines.length > 0,
  };
}

/**
 * Get the last N lines from the buffer for a project (no timestamp filter).
 */
export function tailConsole(projectId: number, n = 15): string[] {
  return logBuffer.tail(projectId, n).map((l) =>
    `${l.stream === "stderr" ? "[err]" : "[out]"} ${l.text.trimEnd()}`
  );
}
