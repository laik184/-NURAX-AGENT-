import type { DependencyGraph, EmbeddingVector, FileMeta, IndexingStatus, SearchableIndex, SymbolMeta } from './types.js';

export interface CodebaseIndexerState {
  readonly files: readonly FileMeta[];
  readonly symbols: readonly SymbolMeta[];
  readonly dependencies: readonly DependencyGraph[];
  readonly embeddings: readonly EmbeddingVector[];
  readonly index: SearchableIndex;
  readonly status: IndexingStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

const EMPTY_INDEX: SearchableIndex = Object.freeze({
  byFile: Object.freeze({}),
  bySymbol: Object.freeze({}),
  dependencies: Object.freeze({}),
  embeddings: Object.freeze({}),
});

const state = {
  files: [] as readonly FileMeta[],
  symbols: [] as readonly SymbolMeta[],
  dependencies: [] as readonly DependencyGraph[],
  embeddings: [] as readonly EmbeddingVector[],
  index: EMPTY_INDEX,
  status: 'IDLE' as IndexingStatus,
  logs: [] as readonly string[],
  errors: [] as readonly string[],
};

export function getIndexerState(): CodebaseIndexerState {
  return state;
}

export function setIndexerState(next: Partial<CodebaseIndexerState>): void {
  if (next.files) {
    state.files = Object.freeze([...next.files]);
  }
  if (next.symbols) {
    state.symbols = Object.freeze([...next.symbols]);
  }
  if (next.dependencies) {
    state.dependencies = Object.freeze([...next.dependencies]);
  }
  if (next.embeddings) {
    state.embeddings = Object.freeze([...next.embeddings]);
  }
  if (next.index) {
    state.index = next.index;
  }
  if (next.status) {
    state.status = next.status;
  }
  if (next.logs) {
    state.logs = Object.freeze([...next.logs]);
  }
  if (next.errors) {
    state.errors = Object.freeze([...next.errors]);
  }
}

export function resetIndexerState(): void {
  setIndexerState({
    files: Object.freeze([]),
    symbols: Object.freeze([]),
    dependencies: Object.freeze([]),
    embeddings: Object.freeze([]),
    index: EMPTY_INDEX,
    status: 'IDLE',
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}
