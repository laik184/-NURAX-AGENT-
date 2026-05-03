import { CheckoutOptions, GitResult } from '../types.js';
import { runGitCommand } from '../utils/git-command.util.js';
import { createLogger } from '../utils/logger.util.js';

export const checkoutAgent = async (options: CheckoutOptions): Promise<GitResult<{ branch: string }>> => {
  const logger = createLogger('checkout.agent');
  const command = options.create ? ['checkout', '-b', options.branch] : ['checkout', options.branch];

  logger.log(`Switching to branch ${options.branch}`);
  await runGitCommand(command);

  return {
    success: true,
    action: 'checkout',
    result: { branch: options.branch },
    logs: logger.getLogs(),
  };
};
