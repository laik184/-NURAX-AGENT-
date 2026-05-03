export type ComponentState = {
  readonly componentType: string;
  readonly processedProps: Readonly<Record<string, unknown>>;
  readonly logs: readonly string[];
};

export function createInitialState(componentType: string): ComponentState {
  return Object.freeze({
    componentType,
    processedProps: Object.freeze({}),
    logs: Object.freeze([]),
  });
}

export function withProcessedProps(
  state: Readonly<ComponentState>,
  processedProps: Readonly<Record<string, unknown>>,
): ComponentState {
  return Object.freeze({
    ...state,
    processedProps: Object.freeze({ ...processedProps }),
  });
}

export function appendLog(state: Readonly<ComponentState>, message: string): ComponentState {
  return Object.freeze({
    ...state,
    logs: Object.freeze([...state.logs, message]),
  });
}
