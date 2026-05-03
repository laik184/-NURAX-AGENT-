import type { ContextChunk } from "../types.js";
import { estimateTokens } from "../utils/token-estimator.util.js";

export function summarizeChunks(chunks: readonly ContextChunk[], summaryMaxTokens: number): readonly ContextChunk[] {
  const safeBudget = Math.max(1, summaryMaxTokens);

  const summarized = chunks.map((chunk) => {
    if (chunk.tokenEstimate <= safeBudget) {
      return chunk;
    }

    const condensed = condenseText(chunk.content, safeBudget);

    return Object.freeze({
      ...chunk,
      content: condensed,
      tokenEstimate: estimateTokens(condensed).tokens,
    });
  });

  return Object.freeze(summarized);
}

function condenseText(text: string, maxTokens: number): string {
  const sentences = text
    .split(/(?<=[.!?\n])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  let running = "";
  for (const sentence of sentences) {
    const candidate = `${running} ${sentence}`.trim();
    if (estimateTokens(candidate).tokens > maxTokens) {
      break;
    }
    running = candidate;
  }

  return running.length > 0 ? running : text.slice(0, maxTokens * 4).trim();
}
