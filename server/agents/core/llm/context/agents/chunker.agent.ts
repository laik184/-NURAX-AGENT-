import type { ContextChunk } from "../types.js";
import { estimateTokens } from "../utils/token-estimator.util.js";
import { splitText } from "../utils/text-splitter.util.js";

export function chunkContext(rawContext: string, chunkSize: number, chunkOverlap: number): readonly ContextChunk[] {
  const pieces = splitText(rawContext, chunkSize, chunkOverlap);

  const chunks = pieces.map((content, index) => {
    const tokenEstimate = estimateTokens(content).tokens;
    const startOffset = index * Math.max(1, chunkSize - Math.min(chunkOverlap, chunkSize - 1));
    const endOffset = startOffset + content.length;

    return Object.freeze({
      id: `chunk-${index + 1}`,
      content,
      startOffset,
      endOffset,
      tokenEstimate,
    });
  });

  return Object.freeze(chunks);
}
