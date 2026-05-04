export * from '../../../../core/shared/utils/logger.util.js';
import type { FileAction, FileOperationLog } from '../types.js';

export function buildOperationLog(params: {
  action: FileAction;
  path: string;
  status: 'success' | 'error';
  message: string;
}): FileOperationLog {
  return Object.freeze({
    timestamp: new Date().toISOString(),
    action: params.action,
    path: params.path,
    status: params.status,
    message: params.message,
  });
}

export function formatLogLine(log: FileOperationLog): string {
  return `[${log.timestamp}] [${log.status}] ${log.action} ${log.path}: ${log.message}`;
}
