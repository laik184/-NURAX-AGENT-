export type FailureType =
  | "syntax"
  | "dependency"
  | "timeout"
  | "permission"
  | "network"
  | "runtime"
  | "validation"
  | "execution"
  | "memory"
  | "unknown";

export type RetryStrategyKind = "exponential" | "linear" | "immediate" | "no-retry";

export type RecoveryStatus = "pending" | "recovering" | "recovered" | "failed" | "skipped";

export interface RecoveryInput {
  readonly error: string | Error;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly agentId?: string;
  readonly sessionId?: string;
  readonly maxAttempts?: number;
  readonly allowDestructive?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface DetectedError {
  readonly message: string;
  readonly stack?: string;
  readonly hasError: boolean;
  readonly errorCode?: string;
}

export interface FailureClassification {
  readonly type: FailureType;
  readonly confidence: number;
  readonly isRecoverable: boolean;
  readonly reason: string;
}

export interface RetryStrategy {
  readonly kind: RetryStrategyKind;
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly reason: string;
}

export interface RecoveryAction {
  readonly id: string;
  readonly description: string;
  readonly safe: boolean;
  readonly estimatedSuccessRate: number;
}

export interface RecoveryPlan {
  readonly actions: readonly RecoveryAction[];
  readonly estimatedSuccessRate: number;
  readonly skipReason?: string;
}

export interface FixResult {
  readonly applied: boolean;
  readonly action?: RecoveryAction;
  readonly reason: string;
}

export interface SafetyCheckResult {
  readonly safe: boolean;
  readonly blockedActions: readonly string[];
  readonly reason: string;
}

export interface RecoveryResult {
  readonly success: boolean;
  readonly recovered: boolean;
  readonly strategy: string;
  readonly attempts: number;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface RetryRecord {
  readonly attempt: number;
  readonly delayMs: number;
  readonly outcome: "success" | "failure";
  readonly timestamp: number;
}

export interface RecoveryState {
  readonly attempts: number;
  readonly lastError: string;
  readonly retryHistory: readonly RetryRecord[];
  readonly status: RecoveryStatus;
}
