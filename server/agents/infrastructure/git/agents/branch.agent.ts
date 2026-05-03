import { BranchOptions, GitResult } from '../types.js';
import { runGitCommand } from '../utils/git-command.util.js';
import { parseBranchList } from '../utils/output-parser.util.js';
import { createLogger } from '../utils/logger.util.js';

export const branchAgent = async (options: BranchOptions): Promise<GitResult<unknown>> => {
  const logger = createLogger('branch.agent');

  if (options.operation === 'list') {
    logger.log('Listing branches');
    const result = await runGitCommand(['branch']);
    return {
      success: true,
      action: 'branch',
      result: { branches: parseBranchList(result.stdout) },
      logs: logger.getLogs(),
    };
  }

  if (!options.name) {
    throw new Error('Branch name is required for create/delete operations');
  }

  if (options.operation === 'create') {
    logger.log(`Creating branch ${options.name}`);
    await runGitCommand(['branch', options.name]);
    return {
      success: true,
      action: 'branch',
      result: { created: options.name },
      logs: logger.getLogs(),
    };
  }

  logger.log(`Deleting branch ${options.name}`);
  await runGitCommand(['branch', options.force ? '-D' : '-d', options.name]);
  return {
    success: true,
    action: 'branch',
    result: { deleted: options.name },
    logs: logger.getLogs(),
  };
};
