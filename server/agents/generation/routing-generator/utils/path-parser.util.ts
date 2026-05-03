import * as path from 'node:path';

const stripKnownSuffix = (input: string): string =>
  input
    .replace(/\.controller\.(t|j)sx?$/i, '')
    .replace(/\.route\.(t|j)sx?$/i, '')
    .replace(/\.(t|j)sx?$/i, '')
    .replace(/\/index$/i, '')
    .replace(/\/_layout$/i, '')
    .replace(/\/layout$/i, '');

export const normalizeRoutePath = (candidate: string): string => {
  const withSlashes = candidate.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\./g, '-');
  const withoutGroups = withSlashes.replace(/\/\([^/]+\)/g, '');
  const route = withoutGroups.startsWith('/') ? withoutGroups : `/${withoutGroups}`;
  return route === '' ? '/' : route;
};

export const filePathToRoutePath = (rootDir: string, filePath: string): string => {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const withoutExtension = stripKnownSuffix(relativePath);

  return normalizeRoutePath(
    withoutExtension
      .replace(/^src\//, '')
      .replace(/^controllers\//, '')
      .replace(/^pages\//, '')
      .replace(/^app\//, ''),
  );
};

export const toParamSegment = (segment: string): string => {
  if (/^\[[^\]]+\]$/.test(segment)) {
    return `:${segment.slice(1, -1)}`;
  }

  if (/^\[\.\.\.[^\]]+\]$/.test(segment)) {
    return `:${segment.slice(4, -1)}*`;
  }

  return segment;
};

export const normalizeDynamicSegments = (routePath: string): string =>
  normalizeRoutePath(
    routePath
      .split('/')
      .filter(Boolean)
      .map(toParamSegment)
      .join('/'),
  );
