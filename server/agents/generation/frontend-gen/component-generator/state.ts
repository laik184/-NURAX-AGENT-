import type { ComponentGeneratorState, GeneratedFile, PropsDefinition } from "./types.js";

export function createInitialState(componentName = ""): ComponentGeneratorState {
  return Object.freeze({
    componentName,
    props: Object.freeze([]),
    template: "",
    files: Object.freeze([]),
    status: "IDLE",
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export function withStatus(
  state: Readonly<ComponentGeneratorState>,
  status: ComponentGeneratorState["status"],
): ComponentGeneratorState {
  return Object.freeze({ ...state, status });
}

export function withProps(
  state: Readonly<ComponentGeneratorState>,
  props: Readonly<PropsDefinition["props"]>,
): ComponentGeneratorState {
  return Object.freeze({ ...state, props: Object.freeze([...props]) });
}

export function withTemplate(
  state: Readonly<ComponentGeneratorState>,
  template: string,
): ComponentGeneratorState {
  return Object.freeze({ ...state, template });
}

export function withFiles(
  state: Readonly<ComponentGeneratorState>,
  files: readonly GeneratedFile[],
): ComponentGeneratorState {
  return Object.freeze({ ...state, files: Object.freeze([...files]) });
}

export function appendLog(
  state: Readonly<ComponentGeneratorState>,
  message: string,
): ComponentGeneratorState {
  return Object.freeze({ ...state, logs: Object.freeze([...state.logs, message]) });
}

export function appendError(
  state: Readonly<ComponentGeneratorState>,
  message: string,
): ComponentGeneratorState {
  return Object.freeze({ ...state, errors: Object.freeze([...state.errors, message]) });
}
