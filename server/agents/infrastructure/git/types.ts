export type GitAction = 'commit' | 'branch' | 'checkout' | 'merge' | 'status' | 'log';

export interface CommitOptions {
  files?: string[];
  message?: string;
  prefix?: string;
  scope?: string;
  body?: string;
}

export interface BranchOptions {
  operation: 'create' | 'delete' | 'list';
  name?: string;
  force?: boolean;
}

export interface CheckoutOptions {
  branch: string;
  create?: boolean;
}

export interface MergeOptions {
  source: string;
  target?: string;
  noFastForward?: boolean;
}

export interface LogOptions {
  limit?: number;
}

export interface GitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitResult<T = unknown> {
  success: boolean;
  action: GitAction;
  result: T;
  logs: string[];
  error?: string;
}

export type GitActionPayloadMap = {
  commit: CommitOptions;
  branch: BranchOptions;
  checkout: CheckoutOptions;
  merge: MergeOptions;
  status: Record<string, never>;
  log: LogOptions;
};
