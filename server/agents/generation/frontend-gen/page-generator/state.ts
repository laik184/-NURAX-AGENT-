import type { PageGeneratorState } from './types';

const state: PageGeneratorState = {
  pageName: '',
  components: [],
  routes: [],
  apiCalls: [],
  status: 'IDLE',
  logs: [],
  errors: [],
};

function freezeSnapshot(current: PageGeneratorState): Readonly<PageGeneratorState> {
  return Object.freeze({
    pageName: current.pageName,
    components: Object.freeze([...current.components]),
    routes: Object.freeze([...current.routes]),
    apiCalls: Object.freeze([...current.apiCalls]),
    status: current.status,
    logs: Object.freeze([...current.logs]),
    errors: Object.freeze([...current.errors]),
  });
}

// Orchestrator-controlled write operations only.
export function setPageGeneratorState(next: PageGeneratorState): Readonly<PageGeneratorState> {
  state.pageName = next.pageName;
  state.components = [...next.components];
  state.routes = [...next.routes];
  state.apiCalls = [...next.apiCalls];
  state.status = next.status;
  state.logs = [...next.logs];
  state.errors = [...next.errors];
  return freezeSnapshot(state);
}

export function getPageGeneratorState(): Readonly<PageGeneratorState> {
  return freezeSnapshot(state);
}

export function resetPageGeneratorState(): Readonly<PageGeneratorState> {
  return setPageGeneratorState({
    pageName: '',
    components: [],
    routes: [],
    apiCalls: [],
    status: 'IDLE',
    logs: [],
    errors: [],
  });
}
