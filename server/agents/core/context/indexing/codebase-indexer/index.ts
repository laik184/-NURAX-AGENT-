import { runCodebaseIndexing } from './orchestrator.js';
import { getIndexerState, resetIndexerState } from './state.js';
import type { BuildIndexInput } from './orchestrator.js';
import type { IndexResult, SearchableIndex } from './types.js';

export async function buildIndex(input: BuildIndexInput = {}): Promise<IndexResult> {
  resetIndexerState();
  return runCodebaseIndexing(input);
}

export async function updateIndex(input: BuildIndexInput = {}): Promise<IndexResult> {
  return runCodebaseIndexing(input);
}

export function getIndex(): SearchableIndex {
  return getIndexerState().index;
}

export * from './types.js';
