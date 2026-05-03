export type PatchType =
  | "ASYNC_REFACTOR"
  | "CACHE_INJECTION"
  | "SYNC_REDUCTION"
  | "WORKER_THREAD_INJECTION"
  | "PAYLOAD_OPTIMIZATION";

export type PatchStatus = "SUCCESS" | "SKIPPED" | "INVALID";

export interface DiffLine {
  readonly lineNumber: number;
  readonly kind:       "added" | "removed" | "unchanged";
  readonly content:    string;
}

export interface DiffResult {
  readonly linesAdded:    number;
  readonly linesRemoved:  number;
  readonly linesChanged:  number;
  readonly hunks:         readonly DiffLine[];
}

export interface PatchResult {
  readonly transformationId: string;
  readonly patchType:        PatchType;
  readonly status:           PatchStatus;
  readonly originalCode:     string;
  readonly patchedCode:      string;
  readonly diffSummary:      DiffResult;
  readonly appliedAt:        number;
  readonly reason:           string | null;
}

export interface PatchRequest {
  readonly code:       string;
  readonly patchType:  PatchType;
  readonly targetHint: string | null;
}

export interface BatchPatchRequest {
  readonly code:       string;
  readonly patchTypes: readonly PatchType[];
}

export interface BatchPatchResult {
  readonly sessionId:   string;
  readonly results:     readonly PatchResult[];
  readonly finalCode:   string;
  readonly appliedAt:   number;
}

export interface TransformationRecord {
  readonly transformationId: string;
  readonly patchType:        PatchType;
  readonly status:           PatchStatus;
  readonly appliedAt:        number;
}

export interface PatchSession {
  readonly sessionId:   string;
  readonly startedAt:   number;
  readonly code:        string;
  readonly patches:     readonly TransformationRecord[];
  readonly completed:   boolean;
}

export const SKIPPED_RESULT_BASE = {
  status:   "SKIPPED"  as PatchStatus,
  reason:   "No applicable pattern found",
  linesAdded:   0,
  linesRemoved: 0,
  linesChanged: 0,
} as const;

export const INVALID_RESULT_BASE = {
  status:   "INVALID"  as PatchStatus,
  reason:   "Invalid input",
} as const;

export const MAX_HISTORY_RECORDS = 200;
