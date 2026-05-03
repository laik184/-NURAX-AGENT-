import type { ChangeType, ClassifiedChange, FileChange } from "../types.js";

function inferChangeType(change: FileChange): ChangeType {
  const hasAdded = change.addedLines.length > 0;
  const hasRemoved = change.removedLines.length > 0;

  if (hasAdded && hasRemoved) return "modify";
  if (hasAdded) return "add";
  return "remove";
}

export function classifyChanges(changes: readonly FileChange[]): readonly ClassifiedChange[] {
  return Object.freeze(
    changes.map((change) => Object.freeze({
      ...change,
      changeType: inferChangeType(change),
    })),
  );
}
