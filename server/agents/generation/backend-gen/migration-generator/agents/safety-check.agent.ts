import type { SafetyCheckResult, SchemaChange } from "../types.js";

function isDestructive(change: SchemaChange): boolean {
  return change.type === "remove_table" || change.type === "remove_column";
}

export function runSafetyChecks(
  changes: readonly SchemaChange[],
  allowDestructive: boolean,
): SafetyCheckResult {
  const blockedChanges = allowDestructive
    ? []
    : changes.filter((change) => isDestructive(change));

  const warnings = changes
    .filter((change) => isDestructive(change))
    .map((change) => `Potential data loss: ${change.type} on ${change.table}${change.column ? `.${change.column}` : ""}`);

  return Object.freeze({
    safe: blockedChanges.length === 0,
    blockedChanges: Object.freeze(blockedChanges),
    warnings: Object.freeze(warnings),
  });
}
