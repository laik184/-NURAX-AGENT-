export interface ThrottleDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

export function evaluatePromptThrottle(input: {
  readonly now: number;
  readonly lastShownAt: number | null;
  readonly dismissedCount: number;
  readonly baseCooldownMs: number;
}): ThrottleDecision {
  const multiplier = Math.max(1, input.dismissedCount + 1);
  const cooldownMs = input.baseCooldownMs * multiplier;

  if (input.lastShownAt === null) {
    return Object.freeze({ allowed: true, reason: "never-shown" });
  }

  const elapsed = input.now - input.lastShownAt;
  if (elapsed < cooldownMs) {
    return Object.freeze({ allowed: false, reason: "cooldown-active" });
  }

  return Object.freeze({ allowed: true, reason: "cooldown-complete" });
}
