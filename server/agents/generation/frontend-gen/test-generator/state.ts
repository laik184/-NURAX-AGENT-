import type { TestType } from "./types.js";

export interface FrontendTestGeneratorState {
  readonly targetFile: string;
  readonly testType: TestType;
  readonly generatedTests: readonly string[];
  readonly coverage: number;
  readonly status: "IDLE" | "GENERATING" | "SUCCESS" | "FAILED";
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

const ORCHESTRATOR_ACTOR = "FRONTEND_TEST_GENERATOR_ORCHESTRATOR";

const INITIAL_STATE: FrontendTestGeneratorState = Object.freeze({
  targetFile: "",
  testType: "component",
  generatedTests: Object.freeze([]),
  coverage: 0,
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

let state: FrontendTestGeneratorState = INITIAL_STATE;

export function getOrchestratorActorToken(): string {
  return ORCHESTRATOR_ACTOR;
}

export function getFrontendTestGeneratorState(): Readonly<FrontendTestGeneratorState> {
  return state;
}

export function mutateFrontendTestGeneratorState(
  actor: string,
  update: Partial<FrontendTestGeneratorState>,
): Readonly<FrontendTestGeneratorState> {
  if (actor !== ORCHESTRATOR_ACTOR) {
    throw new Error("Frontend test generator state is immutable outside orchestrator control.");
  }

  state = Object.freeze({
    ...state,
    ...update,
  });

  return state;
}

export function resetFrontendTestGeneratorState(actor: string): Readonly<FrontendTestGeneratorState> {
  if (actor !== ORCHESTRATOR_ACTOR) {
    throw new Error("Frontend test generator state is immutable outside orchestrator control.");
  }

  state = INITIAL_STATE;
  return state;
}
