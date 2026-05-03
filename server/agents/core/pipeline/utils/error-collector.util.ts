import type { PhaseResult } from '../types.ts';

export interface CollectedError {
  readonly phase: string;
  readonly message: string;
  readonly timestamp: number;
}

const _errors: CollectedError[] = [];

export function collectError(phase: string, message: string): void {
  _errors.push(Object.freeze({ phase, message, timestamp: Date.now() }));
}

export function getAllErrors(): readonly CollectedError[] {
  return Object.freeze([..._errors]);
}

export function clearErrors(): void {
  _errors.length = 0;
}

export function extractErrorsFromPhases(phases: readonly PhaseResult[]): readonly CollectedError[] {
  return Object.freeze(
    phases
      .filter((p) => !p.success && p.error)
      .map((p) =>
        Object.freeze<CollectedError>({
          phase: p.phase,
          message: p.error!,
          timestamp: Date.now(),
        }),
      ),
  );
}

export function formatErrorSummary(errors: readonly CollectedError[]): string {
  if (errors.length === 0) return 'No errors';
  return errors.map((e) => `[${e.phase}] ${e.message}`).join('; ');
}
