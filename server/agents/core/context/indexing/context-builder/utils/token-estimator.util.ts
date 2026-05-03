const TOKEN_APPROX_RATIO = 1.3;

export function estimateTokens(text: string): number {
  if (!text.trim()) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * TOKEN_APPROX_RATIO);
}
