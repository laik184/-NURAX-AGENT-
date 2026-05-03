import type { DiffInput, FileChange } from "../types.js";
import { normalizeAll } from "../utils/diff-normalizer.util.js";

export function parseDiff(input: DiffInput): readonly FileChange[] {
  const lines = input.diff.split(/\r?\n/);
  const changes: FileChange[] = [];

  let currentFile = "";
  let addedLines: string[] = [];
  let removedLines: string[] = [];
  let hunks: string[] = [];

  const flushCurrent = (): void => {
    if (!currentFile) return;
    changes.push(Object.freeze({
      filePath: currentFile,
      addedLines: Object.freeze([...addedLines]),
      removedLines: Object.freeze([...removedLines]),
      hunks: Object.freeze([...hunks]),
    }));
    addedLines = [];
    removedLines = [];
    hunks = [];
  };

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      flushCurrent();
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = match?.[2] ?? "unknown-file";
      continue;
    }

    if (line.startsWith("@@")) {
      hunks.push(line);
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      addedLines.push(line.slice(1));
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      removedLines.push(line.slice(1));
      continue;
    }
  }

  flushCurrent();
  return normalizeAll(changes);
}
