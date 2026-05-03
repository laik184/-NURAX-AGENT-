import type { CodeFile, CodeMap } from "../types.js";
import { normalizePath } from "./naming.util.js";

export function dedupeFiles(files: readonly CodeFile[]): readonly CodeFile[] {
  const seen = new Set<string>();
  const unique: CodeFile[] = [];

  for (const file of files) {
    const normalized = normalizePath(file.path);
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(
      Object.freeze({
        path: normalized,
        content: file.content,
      }),
    );
  }

  return Object.freeze(unique);
}

export function toCodeMap(files: readonly CodeFile[]): CodeMap {
  return Object.freeze({ files: dedupeFiles(files) });
}
