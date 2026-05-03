import { FailureType, RetryStrategyKind } from "../types";

export interface PolicyRule {
  readonly strategyKind: RetryStrategyKind;
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

const FAILURE_POLICY: Record<FailureType, PolicyRule> = {
  timeout:    { strategyKind: "exponential", maxAttempts: 4, baseDelayMs: 1_000, maxDelayMs: 30_000 },
  network:    { strategyKind: "exponential", maxAttempts: 5, baseDelayMs: 500,   maxDelayMs: 20_000 },
  runtime:    { strategyKind: "linear",      maxAttempts: 3, baseDelayMs: 800,   maxDelayMs: 5_000  },
  execution:  { strategyKind: "linear",      maxAttempts: 3, baseDelayMs: 500,   maxDelayMs: 5_000  },
  validation: { strategyKind: "immediate",   maxAttempts: 2, baseDelayMs: 0,     maxDelayMs: 0      },
  dependency: { strategyKind: "linear",      maxAttempts: 2, baseDelayMs: 2_000, maxDelayMs: 10_000 },
  memory:     { strategyKind: "no-retry",    maxAttempts: 0, baseDelayMs: 0,     maxDelayMs: 0      },
  permission: { strategyKind: "no-retry",    maxAttempts: 0, baseDelayMs: 0,     maxDelayMs: 0      },
  syntax:     { strategyKind: "no-retry",    maxAttempts: 0, baseDelayMs: 0,     maxDelayMs: 0      },
  unknown:    { strategyKind: "linear",      maxAttempts: 2, baseDelayMs: 1_000, maxDelayMs: 8_000  },
};

export function getPolicyForFailure(type: FailureType): PolicyRule {
  return FAILURE_POLICY[type] ?? FAILURE_POLICY["unknown"];
}

export function isRetryable(type: FailureType): boolean {
  const policy = getPolicyForFailure(type);
  return policy.strategyKind !== "no-retry" && policy.maxAttempts > 0;
}

export function exceedsMaxAttempts(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}
