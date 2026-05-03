import { AppShellInput } from './types.js';

export interface AppShellState {
  loadingStrategy: AppShellInput['loadingStrategy'];
  routes: AppShellInput['routes'];
  assets: AppShellInput['assets'];
  performanceTargets: AppShellInput['performanceTargets'];
}

export const createAppShellState = (input: AppShellInput): AppShellState =>
  Object.freeze({
    loadingStrategy: input.loadingStrategy,
    routes: Object.freeze([...input.routes]),
    assets: Object.freeze([...input.assets]),
    performanceTargets: Object.freeze({ ...input.performanceTargets }),
  });
