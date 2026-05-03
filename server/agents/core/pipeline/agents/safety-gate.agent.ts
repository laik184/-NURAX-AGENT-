import type { PipelineInput, SafetyCheckResult } from '../types.ts';

const BLOCKED_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = Object.freeze([
  { pattern: /drop\s+table|truncate\s+table/i, reason: 'Destructive SQL operation detected' },
  { pattern: /rm\s+-rf\s+\//i, reason: 'Destructive shell command detected' },
  { pattern: /delete\s+all|destroy\s+all/i, reason: 'Mass-deletion intent detected' },
  { pattern: /<script[^>]*>.*?<\/script>/is, reason: 'XSS payload detected in input' },
]);

const SAFE_MAX_INPUT_LENGTH = 50_000;

export function checkSafety(input: PipelineInput): SafetyCheckResult {
  if (input.input.length > SAFE_MAX_INPUT_LENGTH) {
    return Object.freeze({
      safe: false,
      reason: `Input exceeds maximum allowed length (${input.input.length} > ${SAFE_MAX_INPUT_LENGTH})`,
      blockedBy: 'length-guard',
    });
  }

  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(input.input)) {
      if (!input.allowDestructive) {
        return Object.freeze({
          safe: false,
          reason,
          blockedBy: 'pattern-guard',
        });
      }
    }
  }

  return Object.freeze({
    safe: true,
    reason: 'Input passed all safety checks',
  });
}
