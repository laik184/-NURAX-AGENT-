import { MemoryItem, LearningResult } from "../types";
import { combinedSimilarity, isPatternSimilarity } from "../utils/similarity.util";
import { getState, addItem, updateItem } from "../state";
import { deepFreeze } from "../utils/deep-freeze.util";

export function learnFromHistory(): LearningResult {
  const state = getState();
  const logs: string[] = [];
  let patternsExtracted = 0;
  let patternsUpdated = 0;

  const allItems = [...state.shortTerm, ...state.longTerm];
  const existingPatternKeys = new Set(state.patterns.map((p) => p.patternKey).filter(Boolean));

  const groups = groupBySimilarity(allItems);

  for (const group of groups) {
    if (group.length < 2) continue;

    const representative = selectRepresentative(group);
    const patternKey = buildPatternKey(representative.content);

    if (existingPatternKeys.has(patternKey)) {
      const existing = state.patterns.find((p) => p.patternKey === patternKey);
      if (existing) {
        const now = Date.now();
        updateItem(
          deepFreeze({
            ...existing,
            score: Math.min(existing.score + 5, 100),
            accessCount: existing.accessCount + group.length,
            updatedAt: now,
          })
        );
        patternsUpdated++;
        logs.push(`[learn] Updated existing pattern: ${patternKey}`);
      }
    } else {
      const now = Date.now();
      const patternItem: MemoryItem = deepFreeze({
        id: `pattern-${patternKey}-${now}`,
        content: representative.content,
        type: "pattern",
        score: Math.min(40 + group.length * 5, 90),
        createdAt: now,
        updatedAt: now,
        accessCount: group.length,
        lastAccessedAt: now,
        tags: extractCommonTags(group),
        decayFactor: 0.8,
        patternKey,
      });
      addItem(patternItem);
      patternsExtracted++;
      logs.push(`[learn] Extracted new pattern: ${patternKey} from ${group.length} items`);
    }
  }

  logs.push(`[learn] Patterns extracted: ${patternsExtracted}, updated: ${patternsUpdated}`);

  return Object.freeze({
    patternsExtracted,
    patternsUpdated,
    logs: Object.freeze(logs),
  });
}

function groupBySimilarity(items: MemoryItem[]): MemoryItem[][] {
  const used = new Set<string>();
  const groups: MemoryItem[][] = [];

  for (let i = 0; i < items.length; i++) {
    if (used.has(items[i].id)) continue;
    const group = [items[i]];
    used.add(items[i].id);

    for (let j = i + 1; j < items.length; j++) {
      if (used.has(items[j].id)) continue;
      const sim = combinedSimilarity(items[i].content, items[j].content);
      if (isPatternSimilarity(sim)) {
        group.push(items[j]);
        used.add(items[j].id);
      }
    }

    groups.push(group);
  }

  return groups;
}

function selectRepresentative(group: MemoryItem[]): MemoryItem {
  return group.reduce((best, curr) => (curr.score > best.score ? curr : best));
}

function buildPatternKey(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .slice(0, 6)
    .join("-");
}

function extractCommonTags(group: MemoryItem[]): readonly string[] {
  if (group.length === 0) return Object.freeze([]);
  const tagFreq = new Map<string, number>();
  for (const item of group) {
    for (const tag of item.tags) {
      tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
    }
  }
  const threshold = Math.max(2, Math.floor(group.length / 2));
  return Object.freeze([...tagFreq.entries()].filter(([, count]) => count >= threshold).map(([tag]) => tag));
}
