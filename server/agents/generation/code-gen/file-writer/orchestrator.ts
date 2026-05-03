import { createBackupBeforeWrite } from "./agents/backup-before-write.agent.js";
import { createFile } from "./agents/file-create.agent.js";
import { deleteFile } from "./agents/file-delete.agent.js";
import { checkFileExists } from "./agents/file-exists.agent.js";
import { updateFile } from "./agents/file-update.agent.js";
import { recordFileWriterState } from "./state.js";
import type { FileRequest, FileResult } from "./types.js";
import { buildOperationLog, formatLogLine } from "./utils/logger.util.js";
import { resolveSafePath } from "./utils/path-resolver.util.js";

export const executeFileOperation = async (request: FileRequest): Promise<FileResult> => {
  const operationLogs: string[] = [];
  const resolvedPath = resolveSafePath(request.path);

  try {
    const exists = await checkFileExists(resolvedPath);

    if (request.action === "update" || request.action === "delete") {
      if (!exists) {
        throw new Error(`Cannot ${request.action}: file does not exist.`);
      }
      const backupPath = await createBackupBeforeWrite(resolvedPath);
      operationLogs.push(`Backup created: ${backupPath}`);
    }

    if (request.action === "create") {
      if (exists) {
        throw new Error("Cannot create: file already exists.");
      }
      await createFile(resolvedPath, request.content ?? "");
    }

    if (request.action === "update") {
      await updateFile(resolvedPath, request.content ?? "");
    }

    if (request.action === "delete") {
      await deleteFile(resolvedPath);
    }

    const operationLog = buildOperationLog({
      action: request.action,
      path: resolvedPath,
      status: "success",
      message: "Operation completed successfully."
    });
    const formattedLog = formatLogLine(operationLog);
    operationLogs.push(formattedLog);

    recordFileWriterState({ operation: operationLog, log: formattedLog });

    return Object.freeze({
      success: true,
      action: request.action,
      path: resolvedPath,
      logs: Object.freeze([...operationLogs])
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown file operation error.";
    const operationLog = buildOperationLog({
      action: request.action,
      path: resolvedPath,
      status: "error",
      message: errorMessage
    });
    const formattedLog = formatLogLine(operationLog);
    operationLogs.push(formattedLog);

    recordFileWriterState({ operation: operationLog, log: formattedLog, error: errorMessage });

    return Object.freeze({
      success: false,
      action: request.action,
      path: resolvedPath,
      logs: Object.freeze([...operationLogs]),
      error: errorMessage
    });
  }
};
