import type { DiffPatch, DiffProposal } from "../types.js";
import { stableHash } from "../utils/hash.util.js";

interface FormatterInput {
  filePath: string;
  patches: ReadonlyArray<DiffPatch>;
  unifiedDiff: string;
  warnings: ReadonlyArray<string>;
  affectedSymbols: ReadonlyArray<string>;
  confidence: number;
}

export function formatProposal(input: FormatterInput): DiffProposal {
  const roundedConfidence = Math.max(0, Math.min(1, Number(input.confidence.toFixed(3))));
  return {
    filePath: input.filePath,
    patches: [...input.patches],
    unifiedDiff: input.unifiedDiff,
    affectedSymbols: [...new Set(input.affectedSymbols)].sort(),
    warnings: [...input.warnings],
    confidence: roundedConfidence,
    generatedAt: deterministicTimestamp(input),
  };
}

function deterministicTimestamp(input: FormatterInput): string {
  const seed = stableHash({ filePath: input.filePath, patches: input.patches, unifiedDiff: input.unifiedDiff }).slice(0, 8);
  const seconds = parseInt(seed, 16) % 2_147_483_647;
  return new Date(seconds * 1000).toISOString();
}
