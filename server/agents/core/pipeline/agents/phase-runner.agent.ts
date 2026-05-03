import type { PipelinePhase, PhaseResult } from '../types.ts';

export function runPhase<T>(
  phase: PipelinePhase,
  fn: () => T,
): PhaseResult<T> {
  const start = Date.now();
  const logs: string[] = [];

  try {
    logs.push(`[phase-runner] Starting phase: ${phase}`);
    const data = fn();
    const durationMs = Date.now() - start;
    logs.push(`[phase-runner] Phase ${phase} completed in ${durationMs}ms`);
    return Object.freeze<PhaseResult<T>>({
      phase,
      success: true,
      data,
      durationMs,
      logs: Object.freeze(logs),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - start;
    logs.push(`[phase-runner] Phase ${phase} FAILED after ${durationMs}ms: ${error}`);
    return Object.freeze<PhaseResult<T>>({
      phase,
      success: false,
      error,
      durationMs,
      logs: Object.freeze(logs),
    });
  }
}

export async function runPhaseAsync<T>(
  phase: PipelinePhase,
  fn: () => Promise<T>,
): Promise<PhaseResult<T>> {
  const start = Date.now();
  const logs: string[] = [];

  try {
    logs.push(`[phase-runner] Starting async phase: ${phase}`);
    const data = await fn();
    const durationMs = Date.now() - start;
    logs.push(`[phase-runner] Phase ${phase} completed in ${durationMs}ms`);
    return Object.freeze<PhaseResult<T>>({
      phase,
      success: true,
      data,
      durationMs,
      logs: Object.freeze(logs),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - start;
    logs.push(`[phase-runner] Phase ${phase} FAILED after ${durationMs}ms: ${error}`);
    return Object.freeze<PhaseResult<T>>({
      phase,
      success: false,
      error,
      durationMs,
      logs: Object.freeze(logs),
    });
  }
}
