import type { FormGeneratorState } from "./types.js";

const ORCHESTRATOR_ACTOR = "FORM_GENERATOR_ORCHESTRATOR";

const INITIAL_STATE: FormGeneratorState = Object.freeze({
  formId: "",
  fields: Object.freeze([]),
  validationRules: Object.freeze([]),
  apiEndpoint: "",
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

let generatorState: FormGeneratorState = INITIAL_STATE;

export function getOrchestratorActorToken(): string {
  return ORCHESTRATOR_ACTOR;
}

export function getFormGeneratorState(): Readonly<FormGeneratorState> {
  return generatorState;
}

export function mutateFormGeneratorState(actor: string, update: Partial<FormGeneratorState>): Readonly<FormGeneratorState> {
  if (actor !== ORCHESTRATOR_ACTOR) {
    throw new Error("Form generator state is immutable outside orchestrator control.");
  }

  generatorState = Object.freeze({
    ...generatorState,
    ...update,
  });

  return generatorState;
}

export function resetFormGeneratorState(actor: string): Readonly<FormGeneratorState> {
  if (actor !== ORCHESTRATOR_ACTOR) {
    throw new Error("Form generator state is immutable outside orchestrator control.");
  }

  generatorState = INITIAL_STATE;
  return generatorState;
}
