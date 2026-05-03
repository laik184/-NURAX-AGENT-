import type { TokenEstimate } from "../types.js";

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): Readonly<TokenEstimate> {
  const characters = text.length;
  const tokens = Math.max(0, Math.ceil(characters / CHARS_PER_TOKEN));

  return Object.freeze({
    tokens,
    characters,
    method: "heuristic-char-ratio" as const,
  });
}
