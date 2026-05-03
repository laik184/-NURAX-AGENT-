function tokenize(text: string): readonly string[] {
  return Object.freeze(
    text
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter(Boolean),
  );
}

export function calculateSimilarity(left: string, right: string): number {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const rightSet = new Set(rightTokens);
  let overlap = 0;

  for (const token of leftTokens) {
    if (rightSet.has(token)) overlap += 1;
  }

  const denominator = Math.max(leftTokens.length, rightTokens.length);
  return Math.min(1, overlap / denominator);
}
