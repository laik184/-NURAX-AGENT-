import { MemoryItem, CleanResult } from "../types";
import {
  isExpiredShortTerm,
  computeDecayedScore,
  isBelowThreshold,
  compressDecayFactor,
} from "../utils/decay.util";
import { getState, replaceAll } from "../state";

export function cleanMemory(): CleanResult {
  const state = getState();
  const now = Date.now();
  const logs: string[] = [];
  let removed = 0;
  let compressed = 0;

  const cleanShortTerm = state.shortTerm.filter((item) => {
    if (isExpiredShortTerm(item.createdAt, now)) {
      logs.push(`[clean] Removed expired short-term item: ${item.id}`);
      removed++;
      return false;
    }
    return true;
  });

  const cleanLongTerm = state.longTerm
    .map((item) => {
      const decayedScore = computeDecayedScore(item.score, item.decayFactor, item.createdAt, now, "long");
      if (decayedScore !== item.score) {
        compressed++;
        return Object.freeze({
          ...item,
          score: decayedScore,
          decayFactor: compressDecayFactor(item.decayFactor, item.accessCount),
          updatedAt: now,
        });
      }
      return item;
    })
    .filter((item) => {
      if (isBelowThreshold(item.score)) {
        logs.push(`[clean] Removed low-score long-term item: ${item.id} (score=${item.score})`);
        removed++;
        return false;
      }
      return true;
    });

  const cleanPatterns = state.patterns
    .map((item) => {
      const decayedScore = computeDecayedScore(item.score, item.decayFactor, item.createdAt, now, "pattern");
      if (decayedScore !== item.score) {
        compressed++;
        return Object.freeze({
          ...item,
          score: decayedScore,
          decayFactor: compressDecayFactor(item.decayFactor, item.accessCount),
          updatedAt: now,
        });
      }
      return item;
    })
    .filter((item) => {
      if (isBelowThreshold(item.score)) {
        logs.push(`[clean] Removed low-score pattern item: ${item.id} (score=${item.score})`);
        removed++;
        return false;
      }
      return true;
    });

  replaceAll(cleanShortTerm, cleanLongTerm, cleanPatterns);

  logs.push(`[clean] Cycle complete — removed: ${removed}, compressed: ${compressed}`);

  return Object.freeze({ removed, compressed, logs: Object.freeze(logs) });
}
