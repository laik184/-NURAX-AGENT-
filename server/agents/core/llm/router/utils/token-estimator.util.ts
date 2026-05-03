export function estimateInputTokens(input: string): number {
  if (input.trim().length === 0) return 1;
  return Math.ceil(input.length / 4);
}

export function estimateOutputTokens(maxTokens?: number): number {
  if (!maxTokens || maxTokens < 1) return 512;
  return maxTokens;
}

export function estimateTotalTokens(input: string, maxTokens?: number): number {
  return estimateInputTokens(input) + estimateOutputTokens(maxTokens);
}
