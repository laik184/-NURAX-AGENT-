import type { StorageInput, StorageMode } from "../types.js";
import { deepFreeze } from "../utils/deep-freeze.util.js";

export interface StorageSelection {
  readonly mode: StorageMode;
  readonly reason: string;
}

export function selectStorageMode(input: StorageInput): Readonly<StorageSelection> {
  if (input.sensitive === true) {
    return deepFreeze({ mode: "SECURE", reason: "Sensitive payload requires encrypted storage." });
  }

  if (
    input.operation === "CREATE_TABLE" ||
    input.operation === "READ_TABLE" ||
    input.operation === "WRITE_TABLE" ||
    input.operation === "DELETE_TABLE" ||
    input.preference === "RELATIONAL"
  ) {
    return deepFreeze({ mode: "SQLITE", reason: "Structured operations require relational storage." });
  }

  if (input.preference === "FAST") {
    return deepFreeze({ mode: "MMKV", reason: "Fast access preference selected." });
  }

  return deepFreeze({ mode: "ASYNC", reason: "Small/basic key-value operation routed to AsyncStorage." });
}
