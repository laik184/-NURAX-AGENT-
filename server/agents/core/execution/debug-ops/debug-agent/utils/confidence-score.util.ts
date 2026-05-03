export interface ConfidenceSignal {
  weight: number;
  matched: boolean;
}

export const scoreConfidence = (signals: ConfidenceSignal[]): number => {
  const totalWeight = signals.reduce((total, signal) => total + signal.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  const matchedWeight = signals.reduce((total, signal) => (signal.matched ? total + signal.weight : total), 0);
  return Math.max(0, Math.min(1, Number((matchedWeight / totalWeight).toFixed(2))));
};
