const HIGH_SIMILARITY_THRESHOLD = 0.85;
const PATTERN_SIMILARITY_THRESHOLD = 0.65;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function buildBagOfWords(tokens: string[]): Map<string, number> {
  const bag = new Map<string, number>();
  for (const token of tokens) {
    bag.set(token, (bag.get(token) ?? 0) + 1);
  }
  return bag;
}

export function cosineSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const bagA = buildBagOfWords(tokensA);
  const bagB = buildBagOfWords(tokensB);

  const allKeys = new Set([...bagA.keys(), ...bagB.keys()]);

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const key of allKeys) {
    const va = bagA.get(key) ?? 0;
    const vb = bagB.get(key) ?? 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  const intersection = [...setA].filter((t) => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;

  return union === 0 ? 0 : intersection / union;
}

export function combinedSimilarity(a: string, b: string): number {
  const cosine = cosineSimilarity(a, b);
  const jaccard = jaccardSimilarity(a, b);
  return Math.round(((cosine * 0.6 + jaccard * 0.4) * 100)) / 100;
}

export function isHighSimilarity(score: number): boolean {
  return score >= HIGH_SIMILARITY_THRESHOLD;
}

export function isPatternSimilarity(score: number): boolean {
  return score >= PATTERN_SIMILARITY_THRESHOLD;
}

export { HIGH_SIMILARITY_THRESHOLD, PATTERN_SIMILARITY_THRESHOLD };
