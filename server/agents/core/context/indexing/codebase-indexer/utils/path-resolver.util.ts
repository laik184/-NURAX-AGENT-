import path from 'node:path';

export function resolveRootPath(rootPath?: string): string {
  return path.resolve(rootPath ?? process.cwd());
}

export function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join(path.posix.sep);
}

export function normalizeForIndex(rootPath: string, absolutePath: string): string {
  const relative = path.relative(rootPath, absolutePath);
  return toPosixPath(relative);
}
