import type { ContextChunk } from "../types.js";

export function mergeContext(chunks: readonly ContextChunk[]): string {
  return chunks.map((chunk) => chunk.content.trim()).filter((content) => content.length > 0).join("\n\n---\n\n");
}
