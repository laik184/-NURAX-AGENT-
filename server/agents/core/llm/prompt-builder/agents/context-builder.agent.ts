import type { PromptContext } from "../types.js";
import { cleanString } from "../utils/string-cleaner.util.js";

function normalizeHistory(history: readonly string[]): readonly PromptContext[] {
  return history
    .map((entry, index) => ({
      id: `history-${index + 1}`,
      content: cleanString(entry),
      priority: Math.max(1, 100 - index),
      source: "history",
    }))
    .filter((entry) => entry.content.length > 0);
}

function normalizeContext(context: readonly PromptContext[]): readonly PromptContext[] {
  return context
    .map((entry, index) => ({
      id: entry.id || `context-${index + 1}`,
      content: cleanString(entry.content),
      priority: Number.isFinite(entry.priority) ? entry.priority : 1,
      source: entry.source ?? "context",
    }))
    .filter((entry) => entry.content.length > 0);
}

export function buildContext(
  history: readonly string[] = [],
  context: readonly PromptContext[] = [],
): readonly PromptContext[] {
  const merged = [...normalizeHistory(history), ...normalizeContext(context)]
    .sort((a, b) => b.priority - a.priority);

  return Object.freeze(merged);
}
