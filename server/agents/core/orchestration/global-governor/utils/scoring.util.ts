export interface WeightedFactor {
  value: number;
  weight: number;
}

export function weightedComposite(factors: WeightedFactor[]): number {
  if (factors.length === 0) return 0;
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  if (totalWeight === 0) return 0;
  const sum = factors.reduce((s, f) => s + f.value * f.weight, 0);
  return Math.round((sum / totalWeight) * 1000) / 1000;
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeToUnit(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min));
}

export function invertScore(score: number): number {
  return clamp(1 - clamp(score));
}

export function riskToScore(riskLevel: string): number {
  const map: Record<string, number> = {
    none: 1.0,
    low: 0.85,
    medium: 0.60,
    high: 0.30,
    critical: 0.05,
  };
  return map[riskLevel] ?? 0.5;
}

export function priorityToScore(priority: number, maxPriority = 100): number {
  return clamp(normalizeToUnit(priority, 0, maxPriority));
}
