import { GitResult, LogOptions } from '../types.js';
import { runGitCommand } from '../utils/git-command.util.js';
import { parseLog } from '../utils/output-parser.util.js';
import { createLogger } from '../utils/logger.util.js';

export const logAgent = async (options: LogOptions = {}): Promise<GitResult<{ entries: ReturnType<typeof parseLog> }>> => {
  const logger = createLogger('log.agent');
  const limit = options.limit ?? 20;

  logger.log(`Fetching ${limit} commit entries`);
  const result = await runGitCommand([
    'log',
    `--max-count=${limit}`,
    '--pretty=format:%H|%an|%ad|%s',
    '--date=iso-strict',
  ]);

  return {
    success: true,
    action: 'log',
    result: { entries: parseLog(result.stdout) },
    logs: logger.getLogs(),
  };
};
