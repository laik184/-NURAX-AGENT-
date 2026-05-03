import path from 'node:path';

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.local']);
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf', '.zip', '.gz', '.tar', '.7z', '.mp3', '.mp4',
  '.mov', '.avi', '.woff', '.woff2', '.ttf', '.eot', '.sqlite', '.db', '.bin', '.exe', '.dll',
]);

export function shouldSkipDirectory(name: string): boolean {
  return SKIP_DIRS.has(name);
}

export function isBinaryPath(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export function isRelevantSourceFile(filePath: string): boolean {
  if (isBinaryPath(filePath)) {
    return false;
  }
  return SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}
