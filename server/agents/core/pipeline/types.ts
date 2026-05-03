export type PipelinePhase =
  | 'idle'
  | 'routing'
  | 'safety-check'
  | 'decision'
  | 'planning'
  | 'validation'
  | 'generation'
  | 'execution'
  | 'recovery'
  | 'feedback'
  | 'memory'
  | 'complete'
  | 'failed';

export type PipelineStatus = 'running' | 'success' | 'failed' | 'aborted';

export interface PipelineInput {
  readonly requestId: string;
  readonly input: string;
  readonly sessionId?: string;
  readonly context?: Record<string, unknown>;
  readonly allowDestructive?: boolean;
  readonly maxFeedbackAttempts?: number;
}

export interface PhaseResult<T = unknown> {
  readonly phase: PipelinePhase;
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly durationMs: number;
  readonly logs: readonly string[];
}

export interface PipelineOutput {
  readonly requestId: string;
  readonly success: boolean;
  readonly status: PipelineStatus;
  readonly phases: readonly PhaseResult[];
  readonly finalPhase: PipelinePhase;
  readonly totalDurationMs: number;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface PipelineState {
  readonly requestId: string;
  readonly currentPhase: PipelinePhase;
  readonly status: PipelineStatus;
  readonly startedAt: number;
  readonly phases: readonly PhaseResult[];
}

export interface SafetyCheckResult {
  readonly safe: boolean;
  readonly reason: string;
  readonly blockedBy?: string;
}

export interface PipelineMetrics {
  readonly totalRuns: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly avgDurationMs: number;
  readonly phaseFailureCounts: Readonly<Record<PipelinePhase, number>>;
}
