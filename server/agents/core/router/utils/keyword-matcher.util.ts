export interface KeywordMap {
  readonly [key: string]: readonly string[];
}

export function normalizeInput(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function extractKeywords(input: string): string[] {
  const normalized = normalizeInput(input);
  return normalized.split(" ").filter((w) => w.length > 2);
}

export function matchKeywords(
  input: string,
  keywordMap: KeywordMap
): { key: string; matchCount: number; matched: string[] }[] {
  const words = new Set(extractKeywords(input));
  const results: { key: string; matchCount: number; matched: string[] }[] = [];

  for (const [key, keywords] of Object.entries(keywordMap)) {
    const matched = keywords.filter((kw) => {
      if (words.has(kw)) return true;
      for (const word of words) {
        if (word.includes(kw) || kw.includes(word)) return true;
      }
      return false;
    });
    if (matched.length > 0) {
      results.push({ key, matchCount: matched.length, matched });
    }
  }

  return results.sort((a, b) => b.matchCount - a.matchCount);
}

export function bestMatch(
  input: string,
  keywordMap: KeywordMap
): { key: string; matchCount: number; matched: string[] } | null {
  const matches = matchKeywords(input, keywordMap);
  return matches.length > 0 ? matches[0] : null;
}
