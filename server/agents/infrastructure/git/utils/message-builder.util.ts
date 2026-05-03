import { CommitOptions } from '../types.js';

export const buildCommitMessage = (options: CommitOptions): string => {
  if (options.message && options.message.trim()) {
    return options.message.trim();
  }

  const prefix = options.prefix?.trim() ?? 'chore';
  const scope = options.scope?.trim() ? `(${options.scope.trim()})` : '';
  const body = options.body?.trim() ?? 'update changes';

  return `${prefix}${scope}: ${body}`;
};
