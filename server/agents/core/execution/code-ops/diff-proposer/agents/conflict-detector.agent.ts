import type { DiffPatch } from "../types.js";
import { overlaps } from "../utils/range.util.js";

export function detectConflicts(plans: Map<string, DiffPatch[]>): string[] {
  const warnings: string[] = [];

  for (const [path, patches] of plans) {
    for (let i = 0; i < patches.length; i += 1) {
      for (let j = i + 1; j < patches.length; j += 1) {
        if (overlaps(patches[i].range, patches[j].range)) {
          warnings.push(`${path}: overlapping edits at ${patches[i].range.start}-${patches[i].range.end} and ${patches[j].range.start}-${patches[j].range.end}.`);
        }
      }
    }
  }

  return warnings;
}
