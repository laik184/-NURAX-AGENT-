/**
 * IQ 2000 — Console · Filter Utilities
 *
 * Pattern-matching helpers for classifying raw process output lines
 * into one of the four canonical kinds: stdout | stderr | system | error.
 */

import type { FilterRule, LineKind } from '../types.ts';

// ─── Built-in rule table ───────────────────────────────────────────────────
//  Rules are evaluated in ascending priority order (lower = checked first).
//  First match wins.

export const DEFAULT_RULES: FilterRule[] = [
  // Hard errors — runtime panics, unhandled rejections, OOM
  {
    pattern: /\b(UnhandledPromiseRejection|FATAL|out of memory|Segmentation fault|SIGKILL)\b/i,
    kind: 'error',
    priority: 10,
  },
  // Error-level messages
  {
    pattern: /\b(error|Error|ERROR|exception|Exception|EXCEPTION|ERR!)\b/,
    kind: 'error',
    priority: 20,
  },
  // Warnings written to stderr that are NOT hard errors
  {
    pattern: /\b(warn|warning|WARN|WARNING|deprecated|DeprecationWarning)\b/i,
    kind: 'stderr',
    priority: 30,
  },
  // System/orchestrator annotations
  {
    pattern: /^\[(IQ2000|nura-x|system|orchestrator)\]/i,
    kind: 'system',
    priority: 40,
  },
  // ANSI escape sequences that sneak in — treat as stdout
  {
    pattern: /\x1b\[/,
    kind: 'stdout',
    priority: 50,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Strip ANSI escape codes from a string.
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[mGKHF]/g, '');
}

/**
 * Classify a single text line using the given rule set.
 * Falls back to the provided `defaultKind` when no rule matches.
 */
export function classifyLine(
  text: string,
  rules: FilterRule[],
  defaultKind: LineKind,
): LineKind {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (rule.pattern.test(text)) return rule.kind;
  }
  return defaultKind;
}

/**
 * Normalize a raw line:
 *  1. Strip ANSI codes
 *  2. Trim trailing whitespace
 *  3. Replace null bytes
 */
export function normalizeLine(raw: string): string {
  return stripAnsi(raw).replace(/\0/g, '').trimEnd();
}

/**
 * Split a raw chunk (which may contain multiple lines) into individual
 * non-empty lines, normalizing each.
 */
export function chunkToLines(chunk: Buffer | string): string[] {
  const raw = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  return raw
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((l) => l.length > 0);
}
