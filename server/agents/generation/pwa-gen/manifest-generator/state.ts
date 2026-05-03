export interface ManifestState {
  steps: string[];
  errors: string[];
  warnings: string[];
}

export function createInitialState(): ManifestState {
  return Object.freeze({
    steps: [],
    errors: [],
    warnings: [],
  });
}

export function appendStep(state: Readonly<ManifestState>, step: string): ManifestState {
  return Object.freeze({ ...state, steps: [...state.steps, step] });
}

export function appendError(state: Readonly<ManifestState>, error: string): ManifestState {
  return Object.freeze({ ...state, errors: [...state.errors, error] });
}

export function appendWarning(state: Readonly<ManifestState>, warning: string): ManifestState {
  return Object.freeze({ ...state, warnings: [...state.warnings, warning] });
}
