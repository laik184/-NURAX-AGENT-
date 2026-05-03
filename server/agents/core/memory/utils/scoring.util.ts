const SUCCESS_WEIGHT = 30;
const REPETITION_WEIGHT = 25;
const COMPLEXITY_WEIGHT = 25;
const RARITY_WEIGHT = 20;

export interface ScoreComponents {
  readonly success: number;
  readonly repetition: number;
  readonly complexity: number;
  readonly rarity: number;
}

export function computeSuccessScore(isSuccess?: boolean, isFailed?: boolean): number {
  if (isSuccess === true) return SUCCESS_WEIGHT;
  if (isFailed === true) return Math.round(SUCCESS_WEIGHT * 0.8);
  return Math.round(SUCCESS_WEIGHT * 0.4);
}

export function computeRepetitionScore(occurrences: number): number {
  const clamped = Math.min(occurrences, 10);
  return Math.round((clamped / 10) * REPETITION_WEIGHT);
}

export function computeComplexityScore(content: string): number {
  const len = content.length;
  if (len > 2000) return COMPLEXITY_WEIGHT;
  if (len > 800) return Math.round(COMPLEXITY_WEIGHT * 0.75);
  if (len > 200) return Math.round(COMPLEXITY_WEIGHT * 0.5);
  return Math.round(COMPLEXITY_WEIGHT * 0.2);
}

export function computeRarityScore(tagCount: number, existingSimilar: number): number {
  const tagBonus = Math.min(tagCount * 2, 10);
  const rarityBonus = existingSimilar === 0 ? RARITY_WEIGHT : Math.round(RARITY_WEIGHT / (1 + existingSimilar));
  return Math.min(tagBonus + rarityBonus, RARITY_WEIGHT);
}

export function aggregateScore(components: ScoreComponents): number {
  const total = components.success + components.repetition + components.complexity + components.rarity;
  return Math.min(Math.max(Math.round(total), 0), 100);
}
