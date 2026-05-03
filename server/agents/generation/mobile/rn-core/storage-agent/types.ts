export type StorageMode = "ASYNC" | "MMKV" | "SQLITE" | "SECURE";

export type StorageOperation =
  | "GET"
  | "SET"
  | "REMOVE"
  | "CLEAR"
  | "CREATE_TABLE"
  | "READ_TABLE"
  | "WRITE_TABLE"
  | "DELETE_TABLE";

export interface StorageInput {
  readonly operation: StorageOperation;
  readonly key?: string;
  readonly value?: unknown;
  readonly table?: string;
  readonly record?: Readonly<Record<string, unknown>>;
  readonly where?: Readonly<Record<string, unknown>>;
  readonly preference?: "BASIC" | "FAST" | "RELATIONAL";
  readonly sensitive?: boolean;
}

export interface StorageOutput {
  readonly success: boolean;
  readonly data?: unknown;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface StorageAgentState {
  readonly currentStorageMode: StorageMode;
  readonly lastOperation: StorageOperation | null;
  readonly errorState: string | null;
  readonly accessLogs: readonly string[];
  readonly asyncStorage: Readonly<Record<string, unknown>>;
  readonly mmkvStorage: Readonly<Record<string, unknown>>;
  readonly secureStorage: Readonly<Record<string, string>>;
  readonly sqliteStorage: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>;
}

export interface StorageTransitionPatch {
  readonly currentStorageMode?: StorageMode;
  readonly lastOperation?: StorageOperation | null;
  readonly errorState?: string | null;
  readonly appendLog?: string;
  readonly asyncStorage?: Readonly<Record<string, unknown>>;
  readonly mmkvStorage?: Readonly<Record<string, unknown>>;
  readonly secureStorage?: Readonly<Record<string, string>>;
  readonly sqliteStorage?: Readonly<Record<string, readonly Readonly<Record<string, unknown>>[]>>;
}

export interface AgentExecutionResult {
  readonly nextState: Readonly<StorageAgentState>;
  readonly output: Readonly<StorageOutput>;
}
