import type { ClassifiedChange, ImpactedFile } from "../types.js";
import { mapImpactedFiles } from "../utils/file-mapper.util.js";

function dedupeImpacts(impacts: readonly ImpactedFile[]): readonly ImpactedFile[] {
  const seen = new Set<string>();
  const unique: ImpactedFile[] = [];

  for (const impact of impacts) {
    const key = `${impact.sourceFile}=>${impact.impactedFile}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(impact);
  }

  return Object.freeze(unique);
}

export function analyzeDependencyImpact(changes: readonly ClassifiedChange[]): readonly ImpactedFile[] {
  const changedFiles = changes.map((change) => change.filePath);
  return dedupeImpacts(mapImpactedFiles(changedFiles));
}
