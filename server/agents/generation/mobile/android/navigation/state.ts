import type { DeepLinkConfig, NavGraph, NavigationStatus, Route } from "./types.js";

export interface NavigationState {
  readonly routes: readonly Route[];
  readonly graph: NavGraph | null;
  readonly currentRoute: string;
  readonly history: readonly string[];
  readonly deepLinks: readonly DeepLinkConfig[];
  readonly status: NavigationStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

function freezeList<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}

export function createInitialState(): NavigationState {
  return Object.freeze({
    routes: Object.freeze([]),
    graph: null,
    currentRoute: "",
    history: Object.freeze([]),
    deepLinks: Object.freeze([]),
    status: "IDLE" as NavigationStatus,
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export function withStatus(state: NavigationState, status: NavigationStatus): NavigationState {
  return Object.freeze({ ...state, status });
}

export function withRoutes(state: NavigationState, routes: readonly Route[]): NavigationState {
  return Object.freeze({ ...state, routes: freezeList(routes) });
}

export function withGraph(state: NavigationState, graph: NavGraph | null): NavigationState {
  return Object.freeze({ ...state, graph });
}

export function withDeepLinks(state: NavigationState, deepLinks: readonly DeepLinkConfig[]): NavigationState {
  return Object.freeze({ ...state, deepLinks: freezeList(deepLinks) });
}

export function withCurrentRoute(state: NavigationState, currentRoute: string): NavigationState {
  return Object.freeze({ ...state, currentRoute });
}

export function withHistory(state: NavigationState, history: readonly string[]): NavigationState {
  return Object.freeze({ ...state, history: freezeList(history) });
}

export function appendLog(state: NavigationState, log: string): NavigationState {
  return Object.freeze({ ...state, logs: freezeList([...state.logs, log]) });
}

export function appendError(state: NavigationState, error: string): NavigationState {
  return Object.freeze({ ...state, errors: freezeList([...state.errors, error]) });
}
