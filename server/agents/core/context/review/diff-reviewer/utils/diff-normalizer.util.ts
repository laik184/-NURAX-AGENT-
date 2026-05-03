import type { FileChange } from "../types.js";

function freezeList<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}

export function normalizeFileChange(change: FileChange): FileChange {
  return Object.freeze({
    filePath: change.filePath.trim(),
    addedLines: freezeList(change.addedLines.map((line) => line.trimEnd())),
    removedLines: freezeList(change.removedLines.map((line) => line.trimEnd())),
    hunks: freezeList(change.hunks.map((hunk) => hunk.trimEnd())),
  });
}

export function normalizeAll(changes: readonly FileChange[]): readonly FileChange[] {
  return Object.freeze(changes.map((change) => normalizeFileChange(change)));
}
