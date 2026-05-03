import { FixResult, RecoveryInput, SafetyCheckResult } from "../types";

const DESTRUCTIVE_ACTION_IDS = new Set([
  "delete-data",
  "drop-table",
  "wipe-cache",
  "force-kill-process",
  "reset-database",
  "overwrite-production",
]);

const IRREVERSIBLE_KEYWORDS = [
  "destructive",
  "drop",
  "delete all",
  "wipe",
  "overwrite",
  "format",
  "truncate",
];

export function checkSafety(fix: FixResult, input: RecoveryInput): SafetyCheckResult {
  const blockedActions: string[] = [];

  if (!fix.applied || !fix.action) {
    return Object.freeze({
      safe: true,
      blockedActions: Object.freeze([]),
      reason: "No action to check — safe by default.",
    });
  }

  if (DESTRUCTIVE_ACTION_IDS.has(fix.action.id)) {
    blockedActions.push(fix.action.id);
  }

  const descLower = fix.action.description.toLowerCase();
  const isIrreversible = IRREVERSIBLE_KEYWORDS.some((kw) => descLower.includes(kw));
  if (isIrreversible && !input.allowDestructive) {
    blockedActions.push(`${fix.action.id}:irreversible`);
  }

  if (!fix.action.safe) {
    blockedActions.push(`${fix.action.id}:unsafe-flag`);
  }

  if (blockedActions.length > 0) {
    return Object.freeze({
      safe: false,
      blockedActions: Object.freeze(blockedActions),
      reason: `Safety guard blocked ${blockedActions.length} action(s): ${blockedActions.join(", ")}. Set allowDestructive=true to override.`,
    });
  }

  return Object.freeze({
    safe: true,
    blockedActions: Object.freeze([]),
    reason: `Action "${fix.action.id}" passed all safety checks.`,
  });
}
