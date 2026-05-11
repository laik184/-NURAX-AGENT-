import { v4 as uuid } from 'uuid';
import type {
  FileVersion, SnapshotInput, SnapshotResult, HistoryResult,
  DiffInput, DiffLine, DiffResult, RestoreResult, HistoryServiceConfig, HistoryAuthor,
} from './history.types.ts';
import { crudService } from '../crud/crud.service.ts';

const DEFAULT_CONFIG: HistoryServiceConfig = {
  maxVersionsPerFile: 50,
  autoSnapshotOnSave: true,
  storageBackend: 'memory',
};

type HistoryKey = string;

function makeKey(projectId: string, filePath: string): HistoryKey {
  return `${projectId}::${filePath}`;
}

export class HistoryService {
  private store = new Map<HistoryKey, FileVersion[]>();
  private config: HistoryServiceConfig;

  constructor(config?: Partial<HistoryServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  snapshot(input: SnapshotInput): SnapshotResult {
    const { projectId, filePath, content, author = 'user', message } = input;

    try {
      const key = makeKey(projectId, filePath);
      const existing = this.store.get(key) ?? [];

      const last = existing[existing.length - 1];
      if (last && last.content === content) {
        return { ok: true, version: last };
      }

      const version: FileVersion = {
        id: uuid(),
        projectId,
        filePath,
        content,
        size: Buffer.byteLength(content, 'utf-8'),
        author,
        message,
        createdAt: new Date(),
      };

      const updated = [...existing, version];
      if (updated.length > this.config.maxVersionsPerFile) {
        updated.splice(0, updated.length - this.config.maxVersionsPerFile);
      }

      this.store.set(key, updated);
      return { ok: true, version };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  getHistory(projectId: string, filePath: string): HistoryResult {
    const key = makeKey(projectId, filePath);
    const history = this.store.get(key) ?? [];
    return {
      ok: true,
      projectId,
      filePath,
      history: [...history].reverse(),
      total: history.length,
    };
  }

  getVersion(versionId: string): FileVersion | undefined {
    for (const versions of this.store.values()) {
      const found = versions.find(v => v.id === versionId);
      if (found) return found;
    }
    return undefined;
  }

  diff(input: DiffInput): DiffResult {
    const { versionIdA, versionIdB } = input;
    try {
      const vA = this.getVersion(versionIdA);
      const vB = this.getVersion(versionIdB);

      if (!vA) return { ok: false, versionA: versionIdA, versionB: versionIdB, lines: [], addedCount: 0, removedCount: 0, error: `Version not found: ${versionIdA}` };
      if (!vB) return { ok: false, versionA: versionIdA, versionB: versionIdB, lines: [], addedCount: 0, removedCount: 0, error: `Version not found: ${versionIdB}` };

      const linesA = vA.content.split('\n');
      const linesB = vB.content.split('\n');
      const diffLines = this.computeDiff(linesA, linesB);

      const addedCount = diffLines.filter(l => l.type === 'added').length;
      const removedCount = diffLines.filter(l => l.type === 'removed').length;

      return { ok: true, versionA: versionIdA, versionB: versionIdB, lines: diffLines, addedCount, removedCount };
    } catch (e: any) {
      return { ok: false, versionA: versionIdA, versionB: versionIdB, lines: [], addedCount: 0, removedCount: 0, error: e.message };
    }
  }

  async restore(versionId: string): Promise<RestoreResult> {
    const version = this.getVersion(versionId);
    if (!version) {
      return { ok: false, versionId, filePath: '', error: `Version not found: ${versionId}` };
    }

    const result = await crudService.save({ filePath: version.filePath, content: version.content });
    if (!result.ok) {
      return { ok: false, versionId, filePath: version.filePath, error: result.error };
    }

    this.snapshot({
      projectId: version.projectId,
      filePath: version.filePath,
      content: version.content,
      author: 'system',
      message: `Restored from version ${versionId}`,
    });

    return { ok: true, versionId, filePath: version.filePath };
  }

  clearHistory(projectId: string, filePath: string): void {
    this.store.delete(makeKey(projectId, filePath));
  }

  getStats(): { totalFiles: number; totalVersions: number } {
    let totalVersions = 0;
    for (const versions of this.store.values()) totalVersions += versions.length;
    return { totalFiles: this.store.size, totalVersions };
  }

  private computeDiff(linesA: string[], linesB: string[]): DiffLine[] {
    const result: DiffLine[] = [];
    const maxLen = Math.max(linesA.length, linesB.length);

    for (let i = 0; i < maxLen; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];

      if (lineA === undefined) {
        result.push({ type: 'added', lineNumber: i + 1, content: lineB });
      } else if (lineB === undefined) {
        result.push({ type: 'removed', lineNumber: i + 1, content: lineA });
      } else if (lineA !== lineB) {
        result.push({ type: 'removed', lineNumber: i + 1, content: lineA });
        result.push({ type: 'added', lineNumber: i + 1, content: lineB });
      } else {
        result.push({ type: 'unchanged', lineNumber: i + 1, content: lineA });
      }
    }

    return result;
  }
}

export const historyService = new HistoryService();
