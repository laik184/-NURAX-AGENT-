import type { ContextScore, ContextSourceFile } from "../types.js";

export function selectTopFiles(
  files: readonly ContextSourceFile[],
  scores: readonly ContextScore[],
  maxFiles: number,
): readonly ContextSourceFile[] {
  const orderedPaths = scores
    .filter((score) => score.score > 0)
    .slice(0, Math.max(1, maxFiles))
    .map((score) => score.path);

  const selected = files.filter((file) => orderedPaths.includes(file.path));
  return Object.freeze(selected);
}
