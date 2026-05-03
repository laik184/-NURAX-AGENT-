import type { CompressionState, CompressionStatus, ContextChunk } from "./types.js";

function freezeState(state: CompressionState): Readonly<CompressionState> {
  return Object.freeze({
    ...state,
    chunks: Object.freeze([...state.chunks]),
    selectedChunks: Object.freeze([...state.selectedChunks]),
    logs: Object.freeze([...state.logs]),
    errors: Object.freeze([...state.errors]),
  });
}

export function createInitialState(originalSize: number): Readonly<CompressionState> {
  return freezeState({
    originalSize,
    compressedSize: 0,
    compressionRatio: 0,
    chunks: Object.freeze([]),
    selectedChunks: Object.freeze([]),
    status: "IDLE",
    logs: Object.freeze([]),
    errors: Object.freeze([]),
  });
}

export interface StateTransition {
  readonly compressedSize?: number;
  readonly compressionRatio?: number;
  readonly chunks?: readonly ContextChunk[];
  readonly selectedChunks?: readonly ContextChunk[];
  readonly status?: CompressionStatus;
  readonly log?: string;
  readonly error?: string;
}

export function transitionState(
  current: Readonly<CompressionState>,
  transition: Readonly<StateTransition>,
): Readonly<CompressionState> {
  return freezeState({
    ...current,
    compressedSize: transition.compressedSize ?? current.compressedSize,
    compressionRatio: transition.compressionRatio ?? current.compressionRatio,
    chunks: transition.chunks ?? current.chunks,
    selectedChunks: transition.selectedChunks ?? current.selectedChunks,
    status: transition.status ?? current.status,
    logs: transition.log ? [...current.logs, transition.log] : current.logs,
    errors: transition.error ? [...current.errors, transition.error] : current.errors,
  });
}
