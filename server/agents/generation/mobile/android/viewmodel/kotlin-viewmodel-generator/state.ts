import { ViewModelGeneratorStatus } from './types.js';

export interface KotlinViewModelGeneratorState {
  module: 'viewmodel';
  status: ViewModelGeneratorStatus;
  generatedFiles: string[];
  logs: string[];
  errors: string[];
}

const generatorState: KotlinViewModelGeneratorState = {
  module: 'viewmodel',
  status: 'IDLE',
  generatedFiles: [],
  logs: [],
  errors: [],
};

export const getViewModelGeneratorState = (): Readonly<KotlinViewModelGeneratorState> => Object.freeze({
  ...generatorState,
  generatedFiles: [...generatorState.generatedFiles],
  logs: [...generatorState.logs],
  errors: [...generatorState.errors],
});

export const updateViewModelGeneratorState = (
  updater: (state: KotlinViewModelGeneratorState) => void,
): Readonly<KotlinViewModelGeneratorState> => {
  updater(generatorState);
  return getViewModelGeneratorState();
};

export const resetViewModelGeneratorState = (): Readonly<KotlinViewModelGeneratorState> => {
  generatorState.status = 'IDLE';
  generatorState.generatedFiles = [];
  generatorState.logs = [];
  generatorState.errors = [];

  return getViewModelGeneratorState();
};
