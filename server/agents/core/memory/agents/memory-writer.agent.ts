import { MemoryInput, MemoryItem, MemoryType } from "../types";
import { deepFreeze } from "../utils/deep-freeze.util";
import { addItem } from "../state";

export function writeMemory(
  input: MemoryInput,
  type: MemoryType,
  score: number,
  patternKey?: string
): MemoryItem {
  const now = Date.now();

  const item: MemoryItem = deepFreeze({
    id: input.id,
    content: input.content,
    type,
    score,
    createdAt: now,
    updatedAt: now,
    accessCount: 0,
    lastAccessedAt: now,
    sessionId: input.sessionId,
    tags: Object.freeze([...(input.tags ?? [])]),
    source: input.source,
    decayFactor: 1.0,
    patternKey,
  });

  addItem(item);
  return item;
}
