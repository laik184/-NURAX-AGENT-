import type { DiffPatch, FileEnvelope, LocatedEdit } from "../types.js";
import { clampRange } from "../utils/range.util.js";

export function planEdits(files: ReadonlyArray<FileEnvelope>, edits: ReadonlyArray<LocatedEdit>): Map<string, DiffPatch[]> {
  const fileSet = new Map(files.map((file) => [file.path, file]));
  const grouped = new Map<string, DiffPatch[]>();

  for (const edit of edits) {
    const file = fileSet.get(edit.path);
    if (!file) {
      continue;
    }

    const lineCount = Math.max(file.lines.length, 1);
    const range = clampRange(edit.range, lineCount);
    const patch: DiffPatch = { type: edit.type, range, content: edit.content };

    if (!grouped.has(edit.path)) {
      grouped.set(edit.path, []);
    }

    const collection = grouped.get(edit.path)!;
    if (!isDuplicatePatch(collection, patch)) {
      collection.push(patch);
    }
  }

  for (const [, patches] of grouped) {
    patches.sort((a, b) => a.range.start - b.range.start || a.range.end - b.range.end);
  }

  return grouped;
}

function isDuplicatePatch(existing: ReadonlyArray<DiffPatch>, candidate: DiffPatch): boolean {
  return existing.some(
    (patch) =>
      patch.type === candidate.type &&
      patch.content === candidate.content &&
      patch.range.start === candidate.range.start &&
      patch.range.end === candidate.range.end,
  );
}
