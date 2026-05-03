import type { EmbeddingsEngineState } from './types.js';

export const initialEmbeddingsState: EmbeddingsEngineState = Object.freeze({
  vectors: Object.freeze([]),
  indexMap: Object.freeze({}),
  lastQuery: '',
  results: Object.freeze([]),
  status: 'IDLE',
  logs: Object.freeze([]),
  errors: Object.freeze([]),
});
