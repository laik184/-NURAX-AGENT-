import type { DockerConfiguratorState } from './types.js';

export const createInitialDockerConfiguratorState = (): Readonly<DockerConfiguratorState> =>
  Object.freeze({
    projectType: 'generic',
    dockerfile: '',
    composeFile: '',
    ports: [],
    env: {},
    status: 'IDLE',
    logs: [],
    errors: [],
  });

export const patchDockerConfiguratorState = (
  state: Readonly<DockerConfiguratorState>,
  patch: Partial<DockerConfiguratorState>,
): Readonly<DockerConfiguratorState> =>
  Object.freeze({
    ...state,
    ...patch,
    ports: patch.ports ? [...patch.ports] : [...state.ports],
    env: patch.env ? { ...patch.env } : { ...state.env },
    logs: patch.logs ? [...patch.logs] : [...state.logs],
    errors: patch.errors ? [...patch.errors] : [...state.errors],
  });
