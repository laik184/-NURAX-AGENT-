import type { SupportedFramework, SupportedStateLibrary } from "./types.js";

const ORCHESTRATOR_ACTOR = "STATE_MANAGEMENT_GENERATOR_ORCHESTRATOR";

type GeneratorStatus = "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";

export interface StateGeneratorState {
  readonly framework: SupportedFramework;
  readonly stateLibrary: SupportedStateLibrary;
  readonly modules: readonly string[];
  readonly filesGenerated: readonly string[];
  readonly status: GeneratorStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

const INITIAL_STATE: StateGeneratorState = Object.freeze({
  framework: "react",
  stateLibrary: "redux",
  modules: Object.freeze([]),
  filesGenerated: Object.freeze([]),
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

let currentState: StateGeneratorState = INITIAL_STATE;

export function getOrchestratorActorToken(): string {
  return ORCHESTRATOR_ACTOR;
}

export function getStateGeneratorState(): Readonly<StateGeneratorState> {
  return currentState;
}

export function mutateStateGeneratorState(
  actor: string,
  patch: Partial<StateGeneratorState>,
): Readonly<StateGeneratorState> {
  if (actor !== ORCHESTRATOR_ACTOR) {
    throw new Error("State generator state is immutable outside orchestrator control.");
  }

  currentState = Object.freeze({
    ...currentState,
    ...patch,
  });

  return currentState;
}

export function resetStateGeneratorState(actor: string): Readonly<StateGeneratorState> {
  if (actor !== ORCHESTRATOR_ACTOR) {
    throw new Error("State generator state is immutable outside orchestrator control.");
  }

  currentState = INITIAL_STATE;
  return currentState;
}
