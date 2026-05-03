import { MemoryItem, MemoryQuery } from "../types";
import { combinedSimilarity } from "../utils/similarity.util";
import { getAllItems, updateItem } from "../state";

const DEFAULT_LIMIT = 10;

export function retrieveMemory(query: MemoryQuery): readonly MemoryItem[] {
  const all = getAllItems();
  const now = Date.now();

  let candidates = filterByMeta(all, query);

  if (query.context) {
    candidates = rankBySimilarity(candidates, query.context);
  } else {
    candidates = [...candidates].sort((a, b) => b.score - a.score);
  }

  const limit = query.limit ?? DEFAULT_LIMIT;
  const results = candidates.slice(0, limit);

  for (const item of results) {
    updateItem(
      Object.freeze({
        ...item,
        accessCount: item.accessCount + 1,
        lastAccessedAt: now,
        updatedAt: now,
      })
    );
  }

  return Object.freeze(results);
}

function filterByMeta(items: readonly MemoryItem[], query: MemoryQuery): MemoryItem[] {
  return items.filter((item) => {
    if (query.type && item.type !== query.type) return false;
    if (query.sessionId && item.sessionId !== query.sessionId) return false;
    if (query.minScore !== undefined && item.score < query.minScore) return false;
    if (query.tags && query.tags.length > 0) {
      const hasTag = query.tags.some((tag) => item.tags.includes(tag));
      if (!hasTag) return false;
    }
    return true;
  });
}

function rankBySimilarity(items: MemoryItem[], context: string): MemoryItem[] {
  const scored = items.map((item) => ({
    item,
    sim: combinedSimilarity(context, item.content),
  }));
  scored.sort((a, b) => b.sim - a.sim || b.item.score - a.item.score);
  return scored.map((s) => s.item);
}
