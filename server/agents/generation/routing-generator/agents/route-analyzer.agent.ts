import * as path from 'node:path';
import { fileSystemService } from '../../../../services/index.js';
import type { FrameworkType, RouteAnalyzerResult } from '../types.js';

const SKIP_FOLDERS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache']);

const walkFiles = async (rootDir: string): Promise<readonly string[]> => {
  const discovered: string[] = [];

  const walk = async (current: string): Promise<void> => {
    const entries = await fileSystemService.readDir(current);
    for (const entryName of entries) {
      const fullPath = path.join(current, entryName);
      let stat: { readonly isFile: boolean; readonly isDirectory: boolean; readonly size: number; readonly mtimeMs: number };
      try {
        stat = await fileSystemService.stat(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory) {
        if (!SKIP_FOLDERS.has(entryName) && !entryName.startsWith('.')) {
          await walk(fullPath);
        }
        continue;
      }

      if (stat.isFile && /\.(t|j)sx?$/i.test(entryName)) {
        discovered.push(fullPath);
      }
    }
  };

  await walk(rootDir);
  return Object.freeze(discovered);
};

const detectFrameworkHints = async (rootDir: string): Promise<readonly FrameworkType[]> => {
  const packageJsonPath = path.join(rootDir, 'package.json');

  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {};
  try {
    const content = await fileSystemService.readFile(packageJsonPath, 'utf8');
    packageJson = JSON.parse(content);
  } catch {
    packageJson = {};
  }

  const deps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };

  const hints: FrameworkType[] = [];
  if (deps.express) hints.push('express');
  if (deps.fastify) hints.push('fastify');
  if (deps['@nestjs/core']) hints.push('nestjs');
  if (deps['react-router-dom']) hints.push('react-router');
  if (deps.next) hints.push('nextjs');
  if (deps['vue-router']) hints.push('vue-router');

  return Object.freeze(Array.from(new Set(hints)));
};

export const analyzeProjectStructure = async (rootDir: string): Promise<Readonly<RouteAnalyzerResult>> => {
  const files = await walkFiles(rootDir);

  const backendFiles = files.filter(
    (file) =>
      /(^|\/)controllers\//i.test(file) ||
      /\.controller\.(t|j)sx?$/i.test(file) ||
      /(^|\/)routes\//i.test(file),
  );

  const frontendFiles = files.filter(
    (file) =>
      /(^|\/)pages\//i.test(file) ||
      /(^|\/)app\//i.test(file) ||
      /(^|\/)views\//i.test(file) ||
      /(^|\/)src\/router\//i.test(file),
  );

  const frameworkHints = await detectFrameworkHints(rootDir);

  return Object.freeze({
    backendFiles: Object.freeze(backendFiles),
    frontendFiles: Object.freeze(frontendFiles),
    frameworkHints,
  });
};
