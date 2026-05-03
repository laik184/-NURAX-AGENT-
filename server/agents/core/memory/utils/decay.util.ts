const SHORT_TERM_TTL_MS = 30 * 60 * 1000;
const LONG_TERM_DECAY_RATE = 0.02;
const PATTERN_DECAY_RATE = 0.005;
const DECAY_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MIN_SCORE_THRESHOLD = 10;

export function isExpiredShortTerm(createdAt: number, now: number): boolean {
  return now - createdAt > SHORT_TERM_TTL_MS;
}

export function computeDecayedScore(
  score: number,
  decayFactor: number,
  createdAt: number,
  now: number,
  type: "short" | "long" | "pattern"
): number {
  const ageMs = now - createdAt;
  const intervals = Math.floor(ageMs / DECAY_INTERVAL_MS);

  if (intervals === 0) return score;

  const rate = type === "long" ? LONG_TERM_DECAY_RATE : PATTERN_DECAY_RATE;
  const adjusted = score * Math.pow(1 - rate * decayFactor, intervals);
  return Math.max(Math.round(adjusted), 0);
}

export function isBelowThreshold(score: number): boolean {
  return score < MIN_SCORE_THRESHOLD;
}

export function compressDecayFactor(baseDecay: number, accessCount: number): number {
  const bonus = Math.min(accessCount * 0.05, 0.5);
  return Math.max(baseDecay - bonus, 0.1);
}

export { MIN_SCORE_THRESHOLD };
