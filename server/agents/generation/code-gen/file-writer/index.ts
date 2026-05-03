import { executeFileOperation } from "./orchestrator.js";
import type { FileResult } from "./types.js";

export const writeFile = async (path: string, content: string): Promise<FileResult> =>
  executeFileOperation({ action: "create", path, content });

export const updateFile = async (path: string, content: string): Promise<FileResult> =>
  executeFileOperation({ action: "update", path, content });

export const deleteFile = async (path: string): Promise<FileResult> =>
  executeFileOperation({ action: "delete", path });

export type { FileAction, FileOperationLog, FileRequest, FileResult } from "./types.js";
export { getFileWriterState, resetFileWriterState } from "./state.js";
