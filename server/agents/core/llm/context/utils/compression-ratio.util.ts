export function calculateCompressionRatio(originalTokens: number, finalTokens: number): number {
  if (originalTokens <= 0) {
    return 0;
  }

  return Number((finalTokens / originalTokens).toFixed(4));
}
