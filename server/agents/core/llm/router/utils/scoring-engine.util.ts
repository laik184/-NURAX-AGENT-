export function normalizeCostScore(cost: number): number {
  const bounded = Math.max(0, Math.min(cost, 1));
  return 1 - bounded;
}

export function normalizeLatencyScore(latencyMs: number, maxLatencyMs: number): number {
  if (maxLatencyMs <= 0) return 1;
  const ratio = Math.max(0, Math.min(latencyMs / maxLatencyMs, 1));
  return 1 - ratio;
}

export function weightedScore(parts: {
  capability: number;
  cost: number;
  latency: number;
  quality: number;
  prefersLowCost: boolean;
  prefersLowLatency: boolean;
}): number {
  const capabilityWeight = 0.4;
  const qualityWeight = 0.2;
  const costWeight = parts.prefersLowCost ? 0.3 : 0.2;
  const latencyWeight = parts.prefersLowLatency ? 0.3 : 0.2;

  return Number((
    (parts.capability * capabilityWeight)
    + (parts.quality * qualityWeight)
    + (parts.cost * costWeight)
    + (parts.latency * latencyWeight)
  ).toFixed(6));
}
