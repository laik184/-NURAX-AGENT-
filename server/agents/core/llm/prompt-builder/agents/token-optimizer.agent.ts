import type { PromptContext, TokenStats } from "../types.js";
import { estimateTokens } from "../utils/token-estimator.util.js";

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return `${content.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
}

export function optimizeTokenBudget(
  systemPrompt: string,
  userPrompt: string,
  context: readonly PromptContext[],
  tokenLimit: number,
): {
  readonly context: readonly PromptContext[];
  readonly stats: TokenStats;
} {
  const boundedLimit = Math.max(200, tokenLimit);
  const fixedTokens = estimateTokens(systemPrompt) + estimateTokens(userPrompt);
  const available = Math.max(0, boundedLimit - fixedTokens);

  const kept: PromptContext[] = [];
  let used = 0;

  for (const entry of context) {
    const entryTokens = estimateTokens(entry.content);
    if (used + entryTokens <= available) {
      kept.push(entry);
      used += entryTokens;
      continue;
    }

    if (available - used <= 0) continue;
    const approxCharsPerToken = 4;
    const maxChars = (available - used) * approxCharsPerToken;
    const truncated = truncateContent(entry.content, maxChars);
    const truncatedTokens = estimateTokens(truncated);

    if (truncatedTokens > 0 && used + truncatedTokens <= available) {
      kept.push({ ...entry, content: truncated });
      used += truncatedTokens;
    }
  }

  const estimatedTokens = fixedTokens + used;

  return Object.freeze({
    context: Object.freeze(kept),
    stats: Object.freeze({
      estimatedTokens,
      limit: boundedLimit,
      remaining: Math.max(0, boundedLimit - estimatedTokens),
      truncated: kept.length < context.length || estimatedTokens >= boundedLimit,
    }),
  });
}
