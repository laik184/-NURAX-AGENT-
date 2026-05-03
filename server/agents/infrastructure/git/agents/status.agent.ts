import { GitResult } from '../types.js';
import { runGitCommand } from '../utils/git-command.util.js';
import { parseStatus } from '../utils/output-parser.util.js';
import { createLogger } from '../utils/logger.util.js';

export const statusAgent = async (): Promise<GitResult<{ clean: boolean; summary: string[] }>> => {
  const logger = createLogger('status.agent');

  logger.log('Reading repository status');
  const result = await runGitCommand(['status']);

  return {
    success: true,
    action: 'status',
    result: parseStatus(result.stdout),
    logs: logger.getLogs(),
  };
};
