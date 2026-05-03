import type { PipelinePhase, PhaseResult } from '../types.ts';

export function buildPhaseSummary(phases: readonly PhaseResult[]): string {
  return phases
    .map((p) => `${p.phase}:${p.success ? 'ok' : 'fail'}(${p.durationMs}ms)`)
    .join(' → ');
}

export function getFailedPhases(phases: readonly PhaseResult[]): readonly PhaseResult[] {
  return Object.freeze(phases.filter((p) => !p.success));
}

export function getSlowPhases(phases: readonly PhaseResult[], thresholdMs: number): readonly PhaseResult[] {
  return Object.freeze(phases.filter((p) => p.durationMs > thresholdMs));
}

export function totalDuration(phases: readonly PhaseResult[]): number {
  return phases.reduce((sum, p) => sum + p.durationMs, 0);
}

export function phaseIndex(phase: PipelinePhase): number {
  const ORDER: readonly PipelinePhase[] = [
    'idle', 'routing', 'safety-check', 'decision', 'planning',
    'validation', 'generation', 'execution', 'recovery', 'feedback', 'memory', 'complete', 'failed',
  ];
  return ORDER.indexOf(phase);
}

export function isPhaseBefore(a: PipelinePhase, b: PipelinePhase): boolean {
  return phaseIndex(a) < phaseIndex(b);
}
