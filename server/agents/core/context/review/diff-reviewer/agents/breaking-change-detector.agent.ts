import type { BreakingChange, ClassifiedChange } from "../types.js";
import { scanSymbols } from "../utils/ast-parser.util.js";

function isPotentialApiFile(filePath: string): boolean {
  return /controller|route|api|schema|contract|types?\.ts$/i.test(filePath);
}

export function detectBreakingChanges(changes: readonly ClassifiedChange[]): readonly BreakingChange[] {
  const breakingChanges: BreakingChange[] = [];

  for (const change of changes) {
    if (!isPotentialApiFile(change.filePath)) continue;

    const removedExportSymbols = scanSymbols(change.removedLines).exportedSymbols;
    for (const symbol of removedExportSymbols) {
      breakingChanges.push(Object.freeze({
        filePath: change.filePath,
        reason: `Export removed: ${symbol}`,
      }));
    }

    if (change.changeType === "remove" && change.filePath.endsWith(".ts")) {
      breakingChanges.push(Object.freeze({
        filePath: change.filePath,
        reason: "TypeScript file removal may break public contracts.",
      }));
    }
  }

  return Object.freeze(breakingChanges);
}
