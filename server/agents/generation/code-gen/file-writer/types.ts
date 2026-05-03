export type FileAction = "create" | "update" | "delete";

export interface FileRequest {
  readonly action: FileAction;
  readonly path: string;
  readonly content?: string;
}

export interface FileOperationLog {
  readonly timestamp: string;
  readonly action: FileAction;
  readonly path: string;
  readonly status: "success" | "error";
  readonly message: string;
}

export interface FileResult {
  readonly success: boolean;
  readonly action: FileAction;
  readonly path: string;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface FileWriterState {
  readonly operations: readonly FileOperationLog[];
  readonly lastOperation: {
    readonly action: string;
    readonly path: string;
    readonly status: string;
  } | null;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}
