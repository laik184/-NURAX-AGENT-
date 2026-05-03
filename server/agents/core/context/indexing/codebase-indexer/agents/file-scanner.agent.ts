import path from 'node:path';
import { fileSystemService } from '../../../../../../services/index.js';
import { isRelevantSourceFile, shouldSkipDirectory } from '../utils/file-filter.util.js';
import { createContentHash } from '../utils/hash.util.js';
import { normalizeForIndex } from '../utils/path-resolver.util.js';
import type { FileMeta } from '../types.js';

export interface FileScannerInput {
  readonly rootPath: string;
  readonly previousHashes: Readonly<Record<string, string>>;
}

export async function scanRepositoryFiles(input: FileScannerInput): Promise<readonly FileMeta[]> {
  const discovered: FileMeta[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await fileSystemService.readDir(currentPath);
    for (const entryName of entries) {
      const absolutePath = path.join(currentPath, entryName);
      let stat: { readonly isFile: boolean; readonly isDirectory: boolean; readonly size: number; readonly mtimeMs: number };
      try {
        stat = await fileSystemService.stat(absolutePath);
      } catch {
        continue;
      }

      if (stat.isDirectory) {
        if (shouldSkipDirectory(entryName)) {
          continue;
        }
        await walk(absolutePath);
        continue;
      }

      if (!stat.isFile || !isRelevantSourceFile(absolutePath)) {
        continue;
      }

      const content = await fileSystemService.readFile(absolutePath, 'utf8');
      const relativePath = normalizeForIndex(input.rootPath, absolutePath);
      const hash = createContentHash(content);
      const previousHash = input.previousHashes[relativePath];

      discovered.push({
        path: relativePath,
        extension: path.extname(relativePath),
        size: stat.size,
        hash,
        lastModifiedMs: stat.mtimeMs,
        changed: previousHash !== hash,
      });
    }
  }

  await walk(input.rootPath);
  discovered.sort((a, b) => a.path.localeCompare(b.path));
  return Object.freeze(discovered);
}
