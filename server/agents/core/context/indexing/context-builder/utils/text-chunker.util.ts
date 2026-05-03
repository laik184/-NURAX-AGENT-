import type { ContextChunk } from "../types.js";
import { estimateTokens } from "./token-estimator.util.js";

export function chunkTextByLines(path: string, content: string, linesPerChunk = 40): readonly ContextChunk[] {
  const lines = content.split("\n");
  if (lines.length === 0) return Object.freeze([]);

  const chunks: ContextChunk[] = [];
  for (let index = 0; index < lines.length; index += linesPerChunk) {
    const chunkLines = lines.slice(index, index + linesPerChunk);
    const chunkContent = chunkLines.join("\n").trim();
    if (!chunkContent) continue;

    chunks.push(Object.freeze({
      id: `${path}:${index + 1}`,
      path,
      content: chunkContent,
      startLine: index + 1,
      endLine: Math.min(index + linesPerChunk, lines.length),
      estimatedTokens: estimateTokens(chunkContent),
    }));
  }

  return Object.freeze(chunks);
}
