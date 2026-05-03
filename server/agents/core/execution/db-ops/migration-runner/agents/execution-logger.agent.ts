import { MigrationLog } from '../types.js';
import { buildLog } from '../utils/logger.util.js';

interface LogRequest {
  executionId: string;
  level: MigrationLog['level'];
  step: string;
  message: string;
  migration?: string;
}

export const executionLoggerAgent = (logs: MigrationLog[], request: LogRequest): MigrationLog[] => [
  ...logs,
  buildLog(request),
];
