import { branchAgent } from './agents/branch.agent.js';
import { checkoutAgent } from './agents/checkout.agent.js';
import { commitChangesAgent } from './agents/commit.agent.js';
import { logAgent } from './agents/log.agent.js';
import { mergeAgent } from './agents/merge.agent.js';
import { statusAgent } from './agents/status.agent.js';
import { getGitState, updateGitState } from './state.js';
import { GitAction, GitActionPayloadMap, GitResult } from './types.js';
import { normalizeGitError } from './utils/error-normalizer.util.js';
import { runGitCommand } from './utils/git-command.util.js';

const buildOutput = (result: GitResult): Readonly<GitResult> => Object.freeze(result);

const syncStateFromGit = async (): Promise<void> => {
  const [branchResult, hashResult] = await Promise.all([
    runGitCommand(['branch', '--show-current']),
    runGitCommand(['rev-parse', 'HEAD']),
  ]);

  updateGitState((state) => {
    state.currentBranch = branchResult.stdout.trim();
    state.lastCommitHash = hashResult.stdout.trim();
  });
};

const routeAction = async <T extends GitAction>(
  action: T,
  payload: GitActionPayloadMap[T],
): Promise<GitResult> => {
  switch (action) {
    case 'commit':
      return commitChangesAgent(payload as GitActionPayloadMap['commit']);
    case 'branch':
      return branchAgent(payload as GitActionPayloadMap['branch']);
    case 'checkout':
      return checkoutAgent(payload as GitActionPayloadMap['checkout']);
    case 'merge':
      return mergeAgent(payload as GitActionPayloadMap['merge']);
    case 'status':
      return statusAgent();
    case 'log':
      return logAgent(payload as GitActionPayloadMap['log']);
    default:
      throw new Error(`Unsupported action: ${String(action)}`);
  }
};

export const runGitAction = async <T extends GitAction>(
  action: T,
  payload: GitActionPayloadMap[T],
): Promise<Readonly<GitResult>> => {
  updateGitState((state) => {
    state.status = 'RUNNING';
  });

  try {
    const result = await routeAction(action, payload);

    await syncStateFromGit();
    updateGitState((state) => {
      state.status = result.success ? 'SUCCESS' : 'FAILED';
      state.logs.push(...result.logs);
    });

    return buildOutput(result);
  } catch (error) {
    const normalizedError = normalizeGitError(error);

    updateGitState((state) => {
      state.status = 'FAILED';
      state.errors.push(normalizedError);
    });

    return buildOutput({
      success: false,
      action,
      result: null,
      logs: [...getGitState().logs],
      error: normalizedError,
    });
  }
};

export const commitChanges = (options: GitActionPayloadMap['commit']): Promise<Readonly<GitResult>> =>
  runGitAction('commit', options);

export const createBranch = (name: string): Promise<Readonly<GitResult>> =>
  runGitAction('branch', { operation: 'create', name });

export const mergeBranch = (source: string, target?: string): Promise<Readonly<GitResult>> =>
  runGitAction('merge', { source, target });
