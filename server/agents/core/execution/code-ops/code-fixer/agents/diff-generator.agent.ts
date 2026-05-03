import type { Diff, FileTree } from "../types.js";
import { buildSimpleUnifiedDiff } from "../utils/diff.util.js";

export function generateDiffs(before: FileTree, after: FileTree): ReadonlyArray<Diff> {
  const allPaths = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort((a, b) => a.localeCompare(b));
  const diffs: Diff[] = [];

  for (const filePath of allPaths) {
    const prev = before[filePath] ?? "";
    const next = after[filePath] ?? "";
    if (prev === next) {
      continue;
    }

    const prevLines = prev.split("\n");
    const nextLines = next.split("\n");
    const linesAdded = Math.max(nextLines.length - prevLines.length, 0);
    const linesRemoved = Math.max(prevLines.length - nextLines.length, 0);

    diffs.push(Object.freeze({
      filePath,
      before: prev,
      after: next,
      unifiedDiff: buildSimpleUnifiedDiff(filePath, prev, next),
      linesAdded,
      linesRemoved,
      linesChanged: linesAdded + linesRemoved,
    }));
  }

  return Object.freeze(diffs);
}
