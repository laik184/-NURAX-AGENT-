export type GitAgentStatus = 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface GitAgentState {
  currentBranch: string;
  lastCommitHash: string;
  status: GitAgentStatus;
  logs: string[];
  errors: string[];
}

const gitState: GitAgentState = {
  currentBranch: '',
  lastCommitHash: '',
  status: 'IDLE',
  logs: [],
  errors: [],
};

export const getGitState = (): Readonly<GitAgentState> => Object.freeze({
  ...gitState,
  logs: [...gitState.logs],
  errors: [...gitState.errors],
});

export const updateGitState = (
  updater: (state: GitAgentState) => void,
): Readonly<GitAgentState> => {
  updater(gitState);
  return getGitState();
};
