const KEYWORD_MATCH_WEIGHT = 0.4;
const PATTERN_MATCH_WEIGHT = 0.4;
const CONTEXT_BONUS_WEIGHT = 0.2;
const MAX_KEYWORD_SCORE = 10;
const MAX_PATTERN_WEIGHT = 10;

export function computeConfidence(
  keywordMatchCount: number,
  patternWeight: number,
  hasContext: boolean,
  intentIsKnown: boolean
): number {
  const keywordScore = Math.min(keywordMatchCount / MAX_KEYWORD_SCORE, 1) * KEYWORD_MATCH_WEIGHT;
  const patternScore = Math.min(patternWeight / MAX_PATTERN_WEIGHT, 1) * PATTERN_MATCH_WEIGHT;
  const contextBonus = hasContext ? CONTEXT_BONUS_WEIGHT : 0;
  const unknownPenalty = intentIsKnown ? 0 : 0.15;

  const raw = keywordScore + patternScore + contextBonus - unknownPenalty;
  return Math.max(Math.min(Math.round(raw * 100) / 100, 1), 0);
}

export function buildFactors(
  keywordMatchCount: number,
  patternWeight: number,
  hasContext: boolean,
  intentIsKnown: boolean
): Record<string, number> {
  return {
    keyword: Math.min(keywordMatchCount / MAX_KEYWORD_SCORE, 1),
    pattern: Math.min(patternWeight / MAX_PATTERN_WEIGHT, 1),
    context: hasContext ? 1 : 0,
    intentKnown: intentIsKnown ? 1 : 0,
  };
}

export function isHighConfidence(score: number): boolean {
  return score >= 0.7;
}

export function isMediumConfidence(score: number): boolean {
  return score >= 0.4 && score < 0.7;
}

export function isLowConfidence(score: number): boolean {
  return score < 0.4;
}
