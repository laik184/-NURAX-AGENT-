import type {
  DependencyConfig,
  ServiceGeneratorLog,
  ServiceGeneratorState,
  ServiceMethod,
} from './types.js';

const buildLog = (stage: string, message: string): ServiceGeneratorLog => ({
  timestamp: new Date().toISOString(),
  stage,
  message,
});

const cloneMethods = (methods: ServiceMethod[]): ServiceMethod[] =>
  methods.map((method) => ({ ...method, dependencies: method.dependencies ? [...method.dependencies] : undefined }));

const cloneDependencies = (dependencies: DependencyConfig[]): DependencyConfig[] =>
  dependencies.map((dependency) => ({ ...dependency, requiredMethods: dependency.requiredMethods ? [...dependency.requiredMethods] : undefined }));

export const createInitialState = (entityName = ''): ServiceGeneratorState => ({
  entityName,
  methods: [],
  dependencies: [],
  status: 'IDLE',
  logs: [],
  errors: [],
});

export const ServiceGeneratorStateManager = {
  updateStatus(state: ServiceGeneratorState, status: ServiceGeneratorState['status'], message: string): ServiceGeneratorState {
    const nextState: ServiceGeneratorState = {
      ...state,
      status,
      logs: [...state.logs, buildLog('status', `${status}: ${message}`)],
    };
    return Object.freeze(nextState);
  },

  setEntityName(state: ServiceGeneratorState, entityName: string): ServiceGeneratorState {
    const nextState: ServiceGeneratorState = {
      ...state,
      entityName,
      logs: [...state.logs, buildLog('entity', `Entity set to ${entityName}`)],
    };
    return Object.freeze(nextState);
  },

  setMethods(state: ServiceGeneratorState, methods: ServiceMethod[]): ServiceGeneratorState {
    const nextState: ServiceGeneratorState = {
      ...state,
      methods: cloneMethods(methods),
      logs: [...state.logs, buildLog('methods', `Planned ${methods.length} method(s)`)],
    };
    return Object.freeze(nextState);
  },

  setDependencies(state: ServiceGeneratorState, dependencies: DependencyConfig[]): ServiceGeneratorState {
    const nextState: ServiceGeneratorState = {
      ...state,
      dependencies: cloneDependencies(dependencies),
      logs: [...state.logs, buildLog('dependencies', `Resolved ${dependencies.length} dependency(ies)`)],
    };
    return Object.freeze(nextState);
  },

  addLog(state: ServiceGeneratorState, stage: string, message: string): ServiceGeneratorState {
    const nextState: ServiceGeneratorState = {
      ...state,
      logs: [...state.logs, buildLog(stage, message)],
    };
    return Object.freeze(nextState);
  },

  addError(state: ServiceGeneratorState, error: string): ServiceGeneratorState {
    const nextState: ServiceGeneratorState = {
      ...state,
      status: 'FAILED',
      errors: [...state.errors, error],
      logs: [...state.logs, buildLog('error', error)],
    };
    return Object.freeze(nextState);
  },
};
