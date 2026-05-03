import type {
  GraphQLType,
  MutationDefinition,
  QueryDefinition,
  SchemaState,
  SchemaStatus,
  SubscriptionDefinition,
} from "./types.js";

let schemaState: SchemaState = Object.freeze({
  types: Object.freeze([]),
  queries: Object.freeze([]),
  mutations: Object.freeze([]),
  subscriptions: Object.freeze([]),
  schema: "",
  status: "IDLE",
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});

export function resetSchemaState(): void {
  schemaState = Object.freeze({
    types: Object.freeze([]),
    queries: Object.freeze([]),
    mutations: Object.freeze([]),
    subscriptions: Object.freeze([]),
    schema: "",
    status: "IDLE",
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export function updateSchemaStatus(status: SchemaStatus): void {
  schemaState = Object.freeze({ ...schemaState, status });
}

export function setSchemaParts(parts: {
  readonly types: readonly GraphQLType[];
  readonly queries: readonly QueryDefinition[];
  readonly mutations: readonly MutationDefinition[];
  readonly subscriptions: readonly SubscriptionDefinition[];
}): void {
  schemaState = Object.freeze({
    ...schemaState,
    types: Object.freeze([...parts.types]),
    queries: Object.freeze([...parts.queries]),
    mutations: Object.freeze([...parts.mutations]),
    subscriptions: Object.freeze([...parts.subscriptions]),
  });
}

export function setSchemaValue(schema: string): void {
  schemaState = Object.freeze({ ...schemaState, schema });
}

export function setLogs(logs: readonly string[]): void {
  schemaState = Object.freeze({ ...schemaState, logs: Object.freeze([...logs]) });
}

export function addError(error: string): void {
  schemaState = Object.freeze({
    ...schemaState,
    errors: Object.freeze([...schemaState.errors, error]),
  });
}

export function getSchemaState(): SchemaState {
  return schemaState;
}
