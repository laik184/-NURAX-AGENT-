import { GitResult, MergeOptions } from '../types.js';
import { runGitCommand } from '../utils/git-command.util.js';
import { createLogger } from '../utils/logger.util.js';

export const mergeAgent = async (options: MergeOptions): Promise<GitResult<{ merged: string; conflict: boolean }>> => {
  const logger = createLogger('merge.agent');

  if (options.target) {
    logger.log(`Checking out target branch ${options.target}`);
    await runGitCommand(['checkout', options.target]);
  }

  logger.log(`Merging source branch ${options.source}`);

  try {
    await runGitCommand(['merge', ...(options.noFastForward ? ['--no-ff'] : []), options.source]);
    return {
      success: true,
      action: 'merge',
      result: { merged: options.source, conflict: false },
      logs: logger.getLogs(),
    };
  } catch (error) {
    const conflict = String((error as { stderr?: string }).stderr ?? '').includes('CONFLICT');
    return {
      success: false,
      action: 'merge',
      result: { merged: options.source, conflict },
      logs: logger.getLogs(),
      error: conflict ? 'Merge conflict detected' : 'Merge failed',
    };
  }
};
