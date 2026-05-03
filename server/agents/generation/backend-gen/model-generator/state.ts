import type {
  ConstraintDefinition,
  GeneratorStatus,
  IndexDefinition,
  ModelGeneratorState,
  ParsedSchema,
  RelationDefinition,
} from "./types.js";

const INITIAL_STATE: ModelGeneratorState = Object.freeze({
  modelName: "",
  parsedSchema: null,
  relations: Object.freeze([]),
  constraints: Object.freeze([]),
  indexes: Object.freeze([]),
  generatedCode: "",
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

let currentState: ModelGeneratorState = INITIAL_STATE;

function cloneState(state: ModelGeneratorState): ModelGeneratorState {
  return {
    modelName: state.modelName,
    parsedSchema: state.parsedSchema,
    relations: [...state.relations],
    constraints: [...state.constraints],
    indexes: [...state.indexes],
    generatedCode: state.generatedCode,
    status: state.status,
    logs: [...state.logs],
    errors: [...state.errors],
  };
}

export function getState(): Readonly<ModelGeneratorState> {
  return currentState;
}

export function resetState(): void {
  currentState = INITIAL_STATE;
}

export function transitionState(updater: (draft: ModelGeneratorState) => ModelGeneratorState): void {
  const nextState = updater(cloneState(currentState));
  currentState = Object.freeze({
    ...nextState,
    relations: Object.freeze([...nextState.relations]),
    constraints: Object.freeze([...nextState.constraints]),
    indexes: Object.freeze([...nextState.indexes]),
    logs: Object.freeze([...nextState.logs]),
    errors: Object.freeze([...nextState.errors]),
  });
}

export function appendLog(message: string): void {
  transitionState((draft) => ({ ...draft, logs: [...draft.logs, message] }));
}

export function appendError(message: string): void {
  transitionState((draft) => ({ ...draft, errors: [...draft.errors, message] }));
}

export function setStatus(status: GeneratorStatus): void {
  transitionState((draft) => ({ ...draft, status }));
}

export function setParsedSchema(parsedSchema: ParsedSchema): void {
  transitionState((draft) => ({
    ...draft,
    modelName: parsedSchema.modelName,
    parsedSchema,
  }));
}

export function setRelations(relations: readonly RelationDefinition[]): void {
  transitionState((draft) => ({ ...draft, relations: [...relations] }));
}

export function setConstraints(constraints: readonly ConstraintDefinition[]): void {
  transitionState((draft) => ({ ...draft, constraints: [...constraints] }));
}

export function setIndexes(indexes: readonly IndexDefinition[]): void {
  transitionState((draft) => ({ ...draft, indexes: [...indexes] }));
}

export function setGeneratedCode(generatedCode: string): void {
  transitionState((draft) => ({ ...draft, generatedCode }));
}
