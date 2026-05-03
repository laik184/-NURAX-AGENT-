import { MemoryState, MemoryItem, MemoryType } from "./types";
import { deepFreeze } from "./utils/deep-freeze.util";

const INITIAL_STATE: MemoryState = deepFreeze({
  shortTerm: [],
  longTerm: [],
  patterns: [],
  lastUpdated: 0,
});

let _state: MemoryState = INITIAL_STATE;

export function getState(): MemoryState {
  return _state;
}

export function addItem(item: MemoryItem): MemoryState {
  const bucket = resolveBucket(item.type);
  const next: MemoryState = deepFreeze({
    ..._state,
    [bucket]: [..._state[bucket], item],
    lastUpdated: Date.now(),
  });
  _state = next;
  return _state;
}

export function removeItems(ids: readonly string[]): MemoryState {
  const idSet = new Set(ids);
  const next: MemoryState = deepFreeze({
    shortTerm: _state.shortTerm.filter((i) => !idSet.has(i.id)),
    longTerm: _state.longTerm.filter((i) => !idSet.has(i.id)),
    patterns: _state.patterns.filter((i) => !idSet.has(i.id)),
    lastUpdated: Date.now(),
  });
  _state = next;
  return _state;
}

export function updateItem(updated: MemoryItem): MemoryState {
  const bucket = resolveBucket(updated.type);
  const next: MemoryState = deepFreeze({
    ..._state,
    [bucket]: _state[bucket].map((i) => (i.id === updated.id ? updated : i)),
    lastUpdated: Date.now(),
  });
  _state = next;
  return _state;
}

export function replaceAll(
  shortTerm: readonly MemoryItem[],
  longTerm: readonly MemoryItem[],
  patterns: readonly MemoryItem[]
): MemoryState {
  const next: MemoryState = deepFreeze({
    shortTerm,
    longTerm,
    patterns,
    lastUpdated: Date.now(),
  });
  _state = next;
  return _state;
}

export function getAllItems(): readonly MemoryItem[] {
  return [..._state.shortTerm, ..._state.longTerm, ..._state.patterns];
}

function resolveBucket(type: MemoryType): "shortTerm" | "longTerm" | "patterns" {
  if (type === "short") return "shortTerm";
  if (type === "long") return "longTerm";
  return "patterns";
}
