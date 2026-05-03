import type { PipelineState, PipelinePhase, PipelineStatus, PhaseResult, PipelineMetrics } from './types.ts';

const DEFAULT_METRICS: PipelineMetrics = Object.freeze({
  totalRuns: 0,
  successCount: 0,
  failureCount: 0,
  avgDurationMs: 0,
  phaseFailureCounts: Object.freeze({} as Record<PipelinePhase, number>),
});

let _state: PipelineState | null = null;
let _metrics: PipelineMetrics = DEFAULT_METRICS;

export function initPipeline(requestId: string): PipelineState {
  _state = Object.freeze<PipelineState>({
    requestId,
    currentPhase: 'idle',
    status: 'running',
    startedAt: Date.now(),
    phases: Object.freeze([]),
  });
  return _state;
}

export function getState(): PipelineState | null {
  return _state;
}

export function advancePhase(phase: PipelinePhase): PipelineState {
  if (!_state) throw new Error('Pipeline not initialized. Call initPipeline() first.');
  _state = Object.freeze<PipelineState>({
    ..._state,
    currentPhase: phase,
  });
  return _state;
}

export function recordPhaseResult(result: PhaseResult): PipelineState {
  if (!_state) throw new Error('Pipeline not initialized.');
  _state = Object.freeze<PipelineState>({
    ..._state,
    phases: Object.freeze([..._state.phases, result]),
  });
  return _state;
}

export function setStatus(status: PipelineStatus): PipelineState {
  if (!_state) throw new Error('Pipeline not initialized.');
  _state = Object.freeze<PipelineState>({ ..._state, status });
  return _state;
}

export function recordRun(success: boolean, durationMs: number, failedPhase?: PipelinePhase): void {
  const total = _metrics.totalRuns + 1;
  const successCount = _metrics.successCount + (success ? 1 : 0);
  const failureCount = _metrics.failureCount + (success ? 0 : 1);
  const avgDurationMs = Math.round(
    (_metrics.avgDurationMs * _metrics.totalRuns + durationMs) / total,
  );

  const phaseFailureCounts = { ..._metrics.phaseFailureCounts } as Record<PipelinePhase, number>;
  if (!success && failedPhase) {
    phaseFailureCounts[failedPhase] = (phaseFailureCounts[failedPhase] ?? 0) + 1;
  }

  _metrics = Object.freeze<PipelineMetrics>({
    totalRuns: total,
    successCount,
    failureCount,
    avgDurationMs,
    phaseFailureCounts: Object.freeze(phaseFailureCounts),
  });
}

export function getMetrics(): PipelineMetrics {
  return _metrics;
}

export function clearState(): void {
  _state = null;
}
