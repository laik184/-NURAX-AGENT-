import type { DiffPatch, FileEnvelope } from "../types.js";
import { buildUnifiedDiff } from "../utils/text-diff.util.js";

export interface GeneratedDiff {
  filePath: string;
  afterContent: string;
  unifiedDiff: string;
}

export function generateDiffs(files: ReadonlyArray<FileEnvelope>, plans: Map<string, DiffPatch[]>): ReadonlyArray<GeneratedDiff> {
  const generated: GeneratedDiff[] = [];

  for (const file of files) {
    const patches = plans.get(file.path) ?? [];
    if (patches.length === 0) {
      continue;
    }

    const after = applyPatches(file.content, patches);
    generated.push({
      filePath: file.path,
      afterContent: after,
      unifiedDiff: buildUnifiedDiff({ filePath: file.path, before: file.content, after }),
    });
  }

  return generated;
}

function applyPatches(content: string, patches: ReadonlyArray<DiffPatch>): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let shift = 0;

  for (const patch of patches) {
    const start = patch.range.start - 1 + shift;
    const end = patch.range.end - 1 + shift;
    const insertLines = patch.content.length > 0 ? patch.content.split("\n") : [];

    if (patch.type === "add") {
      lines.splice(start, 0, ...insertLines);
      shift += insertLines.length;
      continue;
    }

    const deleteCount = Math.max(0, end - start + 1);
    if (patch.type === "delete") {
      lines.splice(start, deleteCount);
      shift -= deleteCount;
      continue;
    }

    lines.splice(start, deleteCount, ...insertLines);
    shift += insertLines.length - deleteCount;
  }

  return lines.join("\n");
}
