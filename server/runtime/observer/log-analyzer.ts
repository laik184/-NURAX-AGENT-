/**
 * log-analyzer.ts
 *
 * Pattern-match log lines to classify errors and extract signals.
 *
 * Ownership: runtime/observer — single responsibility: classify log text.
 * No I/O, no bus access, fully synchronous and pure.
 */

import type { BufferedLine } from "./log-buffer.ts";

// ─── Error pattern catalog ────────────────────────────────────────────────────

interface ErrorPattern {
  readonly type: ErrorClass;
  readonly severity: "fatal" | "error" | "warn";
  readonly patterns: readonly RegExp[];
}

export type ErrorClass =
  | "missing_module"
  | "syntax_error"
  | "port_conflict"
  | "compile_error"
  | "runtime_error"
  | "oom"
  | "permission"
  | "network"
  | "unknown_crash";

const ERROR_PATTERNS: readonly ErrorPattern[] = [
  {
    type: "missing_module",
    severity: "fatal",
    patterns: [/cannot find module/i, /module not found/i, /failed to resolve/i, /no such file or directory/i],
  },
  {
    type: "syntax_error",
    severity: "fatal",
    patterns: [/syntaxerror/i, /unexpected token/i, /unexpected end of/i, /parse error/i, /unexpected identifier/i],
  },
  {
    type: "port_conflict",
    severity: "fatal",
    patterns: [/eaddrinuse/i, /address already in use/i, /port.*in use/i, /listen.*eaddrinuse/i],
  },
  {
    type: "compile_error",
    severity: "fatal",
    patterns: [/error ts\d+/i, /compilation failed/i, /type error/i, /build failed/i, /failed to compile/i],
  },
  {
    type: "oom",
    severity: "fatal",
    patterns: [/out of memory/i, /heap out of memory/i, /javascript heap/i, /enomem/i],
  },
  {
    type: "permission",
    severity: "fatal",
    patterns: [/permission denied/i, /eacces/i, /eperm/i, /access denied/i],
  },
  {
    type: "runtime_error",
    severity: "error",
    patterns: [/typeerror/i, /referenceerror/i, /rangeerror/i, /is not a function/i, /cannot read prop/i, /cannot read properties/i],
  },
  {
    type: "network",
    severity: "error",
    patterns: [/econnrefused/i, /enotfound/i, /socket hang up/i, /network error/i],
  },
  {
    type: "unknown_crash",
    severity: "error",
    patterns: [/\berror\b/i, /\bexception\b/i, /uncaught/i, /unhandledpromiserejection/i, /fatal/i],
  },
];

// ─── Success signal catalog ────────────────────────────────────────────────────

const SUCCESS_PATTERNS: readonly RegExp[] = [
  /listening on/i,
  /server.*running/i,
  /server.*started/i,
  /ready in \d+/i,
  /local:.*http/i,
  /started.*port/i,
  /app.*running/i,
  /vite.*ready/i,
  /webpack.*compiled/i,
  /started server/i,
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetectedError {
  type: ErrorClass;
  severity: "fatal" | "error" | "warn";
  line: string;
  ts: number;
}

export interface AnalysisResult {
  hasErrors: boolean;
  hasFatalError: boolean;
  hasSuccessSignal: boolean;
  errors: DetectedError[];
  successLine?: string;
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────

export function analyzeLines(lines: BufferedLine[]): AnalysisResult {
  const errors: DetectedError[] = [];
  let successLine: string | undefined;

  for (const { text, ts } of lines) {
    if (!successLine) {
      for (const pat of SUCCESS_PATTERNS) {
        if (pat.test(text)) { successLine = text; break; }
      }
    }

    for (const ep of ERROR_PATTERNS) {
      const matched = ep.patterns.some(p => p.test(text));
      if (matched) {
        errors.push({ type: ep.type, severity: ep.severity, line: text.slice(0, 300), ts });
        break;
      }
    }
  }

  const hasFatalError = errors.some(e => e.severity === "fatal");
  return {
    hasErrors:        errors.length > 0,
    hasFatalError,
    hasSuccessSignal: !!successLine,
    errors,
    successLine,
  };
}
