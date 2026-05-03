import { CommitOptions, GitResult } from '../types.js';
import { runGitCommand } from '../utils/git-command.util.js';
import { createLogger } from '../utils/logger.util.js';
import { buildCommitMessage } from '../utils/message-builder.util.js';

export const commitChangesAgent = async (options: CommitOptions): Promise<GitResult<{ hash: string; message: string }>> => {
  const logger = createLogger('commit.agent');
  const filesToStage = options.files?.length ? options.files : ['.'];

  logger.log(`Staging files: ${filesToStage.join(', ')}`);
  await runGitCommand(['add', ...filesToStage]);

  const message = buildCommitMessage(options);
  logger.log(`Committing with message: ${message}`);
  await runGitCommand(['commit', '-m', message]);

  const hashResult = await runGitCommand(['rev-parse', 'HEAD']);
  const hash = hashResult.stdout.trim();

  return {
    success: true,
    action: 'commit',
    result: { hash, message },
    logs: logger.getLogs(),
  };
};
