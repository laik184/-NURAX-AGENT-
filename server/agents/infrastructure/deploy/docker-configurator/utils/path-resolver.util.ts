import path from 'node:path';

export const resolveDockerPath = (basePath: string, target: string): string => path.posix.join(basePath, target);
