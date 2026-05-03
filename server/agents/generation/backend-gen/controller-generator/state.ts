import type {
  ControllerGeneratorState,
  GeneratorStatus,
  MethodDefinition,
  RouteDefinition,
  ValidationSchema,
} from "./types.js";

function freezeState(state: ControllerGeneratorState): ControllerGeneratorState {
  return Object.freeze({
    ...state,
    routes: Object.freeze([...state.routes]),
    methods: Object.freeze([...state.methods]),
    validations: Object.freeze([...state.validations]),
    logs: Object.freeze([...state.logs]),
    errors: Object.freeze([...state.errors]),
  });
}

export function createInitialState(controllerName = ""): ControllerGeneratorState {
  return freezeState({
    controllerName,
    routes: [],
    methods: [],
    validations: [],
    status: "IDLE",
    logs: [],
    errors: [],
  });
}

export class ControllerGeneratorStateStore {
  private state: ControllerGeneratorState;

  public constructor(initialState = createInitialState()) {
    this.state = initialState;
  }

  public snapshot(): ControllerGeneratorState {
    return this.state;
  }

  public transition(input: {
    readonly status?: GeneratorStatus;
    readonly controllerName?: string;
    readonly routes?: readonly RouteDefinition[];
    readonly methods?: readonly MethodDefinition[];
    readonly validations?: readonly ValidationSchema[];
    readonly log?: string;
    readonly error?: string;
  }): ControllerGeneratorState {
    const nextState: ControllerGeneratorState = {
      ...this.state,
      ...(input.status ? { status: input.status } : {}),
      ...(typeof input.controllerName === "string" ? { controllerName: input.controllerName } : {}),
      ...(input.routes ? { routes: input.routes } : {}),
      ...(input.methods ? { methods: input.methods } : {}),
      ...(input.validations ? { validations: input.validations } : {}),
      logs: input.log ? [...this.state.logs, input.log] : [...this.state.logs],
      errors: input.error ? [...this.state.errors, input.error] : [...this.state.errors],
    };

    this.state = freezeState(nextState);
    return this.state;
  }
}
