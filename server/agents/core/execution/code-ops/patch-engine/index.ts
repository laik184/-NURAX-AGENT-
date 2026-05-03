export type {
  PatchType,
  PatchStatus,
  DiffLine,
  DiffResult,
  PatchResult,
  PatchRequest,
  BatchPatchRequest,
  BatchPatchResult,
  TransformationRecord,
  PatchSession,
} from "./types.js";

export { SKIPPED_RESULT_BASE, INVALID_RESULT_BASE } from "./types.js";

export {
  applyPatch,
  applyBatchPatch,
  getHistory,
  resetCounter,
} from "./orchestrator.js";
