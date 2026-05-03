import type { Query } from "../types.js";

const N_PLUS_ONE_THRESHOLD = 3;
const SIMILARITY_THRESHOLD = 0.85;

export function normalizeForSimilarity(sql: string): string {
  return sql
    .replace(/\$\d+|'\w+'|\d+/g, "?")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function computeSimilarity(a: string, b: string): number {
  const normA = normalizeForSimilarity(a);
  const normB = normalizeForSimilarity(b);
  if (normA === normB) return 1.0;

  const longer = normA.length > normB.length ? normA : normB;
  const shorter = normA.length > normB.length ? normB : normA;
  if (longer.length === 0) return 1.0;

  const editDist = levenshtein(longer, shorter);
  return parseFloat(((longer.length - editDist) / longer.length).toFixed(2));
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: b.length + 1 }, (_, i) =>
    Array.from({ length: a.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i]![j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1]![j - 1]!
          : Math.min(
              matrix[i - 1]![j - 1]! + 1,
              matrix[i - 1]![j]! + 1,
              matrix[i]![j - 1]! + 1,
            );
    }
  }
  return matrix[b.length]![a.length]!;
}

export interface SimilarityGroup {
  readonly pattern: string;
  readonly queries: readonly Query[];
  readonly count: number;
}

export function groupSimilarQueries(queries: readonly Query[]): readonly SimilarityGroup[] {
  const groups: Array<{ pattern: string; queries: Query[] }> = [];

  for (const query of queries) {
    const norm = normalizeForSimilarity(query.sql);
    const existing = groups.find((g) => computeSimilarity(g.pattern, norm) >= SIMILARITY_THRESHOLD);
    if (existing) {
      existing.queries.push(query);
    } else {
      groups.push({ pattern: norm, queries: [query] });
    }
  }

  return Object.freeze(
    groups
      .filter((g) => g.queries.length >= N_PLUS_ONE_THRESHOLD)
      .map((g) =>
        Object.freeze({
          pattern: g.pattern,
          queries: Object.freeze(g.queries),
          count: g.queries.length,
        }),
      ),
  );
}

export function getNPlusOneThreshold(): number {
  return N_PLUS_ONE_THRESHOLD;
}
