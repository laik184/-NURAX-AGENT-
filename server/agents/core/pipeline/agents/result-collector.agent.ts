import type { PhaseResult, PipelineOutput, PipelineStatus } from '../types.ts';

export function collectResults(
  requestId: string,
  phases: readonly PhaseResult[],
  startedAt: number,
): PipelineOutput {
  const totalDurationMs = Date.now() - startedAt;
  const allLogs: string[] = [];
  let success = true;
  let finalPhase = phases[phases.length - 1]?.phase ?? 'idle';
  let error: string | undefined;

  for (const phase of phases) {
    allLogs.push(...phase.logs);
    if (!phase.success) {
      success = false;
      finalPhase = phase.phase;
      error = phase.error;
      break;
    }
  }

  const status: PipelineStatus = success ? 'success' : 'failed';
  allLogs.push(`[result-collector] Pipeline ${status} in ${totalDurationMs}ms. Phases: ${phases.length}`);

  return Object.freeze<PipelineOutput>({
    requestId,
    success,
    status,
    phases: Object.freeze(phases),
    finalPhase,
    totalDurationMs,
    logs: Object.freeze(allLogs),
    ...(error ? { error } : {}),
  });
}
