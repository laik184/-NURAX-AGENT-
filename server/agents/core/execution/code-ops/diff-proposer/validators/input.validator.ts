import type { DiffProposerInput } from "../types.js";
import { DiffProposerError } from "../utils/error.util.js";

export function validateInput(input: DiffProposerInput): void {
  if (!input || typeof input !== "object") {
    throw new DiffProposerError("INVALID_INPUT", "Input must be an object.");
  }

  if (!Array.isArray(input.targetFiles) || input.targetFiles.length === 0) {
    throw new DiffProposerError("INVALID_TARGET_FILES", "targetFiles must be a non-empty array.");
  }

  const seen = new Set<string>();
  for (const file of input.targetFiles) {
    if (!file.path || typeof file.path !== "string") {
      throw new DiffProposerError("INVALID_FILE_PATH", "Each target file must have a path.");
    }
    if (seen.has(file.path)) {
      throw new DiffProposerError("DUPLICATE_FILE", `Duplicate file path detected: ${file.path}`);
    }
    if (typeof file.content !== "string") {
      throw new DiffProposerError("INVALID_FILE_CONTENT", `File content must be string: ${file.path}`);
    }
    seen.add(file.path);
  }

  if (!input.changeIntent || typeof input.changeIntent.action !== "string") {
    throw new DiffProposerError("INVALID_INTENT", "changeIntent.action must be a string.");
  }
}
