export type HistoryAuthor = 'user' | 'ai' | 'system';

export interface FileVersion {
  id: string;
  projectId: string;
  filePath: string;
  content: string;
  size: number;
  author: HistoryAuthor;
  message?: string;
  createdAt: Date;
}

export interface SnapshotInput {
  projectId: string;
  filePath: string;
  content: string;
  author?: HistoryAuthor;
  message?: string;
}

export interface SnapshotResult {
  ok: boolean;
  version?: FileVersion;
  error?: string;
}

export interface HistoryResult {
  ok: boolean;
  projectId: string;
  filePath: string;
  history: FileVersion[];
  total: number;
  error?: string;
}

export interface DiffInput {
  versionIdA: string;
  versionIdB: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  lineNumber: number;
  content: string;
}

export interface DiffResult {
  ok: boolean;
  versionA: string;
  versionB: string;
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
  error?: string;
}

export interface RestoreResult {
  ok: boolean;
  versionId: string;
  filePath: string;
  error?: string;
}

export interface HistoryServiceConfig {
  maxVersionsPerFile: number;
  autoSnapshotOnSave: boolean;
  storageBackend: 'memory' | 'db';
}
