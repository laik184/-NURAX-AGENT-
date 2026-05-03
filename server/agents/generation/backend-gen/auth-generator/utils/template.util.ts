import type { GeneratedFile } from '../types.js';

export const createGeneratedFile = (path: string, content: string): GeneratedFile => ({
  path,
  content: content.trimStart(),
});

export const mergeGeneratedFiles = (...groups: GeneratedFile[][]): GeneratedFile[] => {
  const dedup = new Map<string, GeneratedFile>();
  groups.flat().forEach((file) => {
    dedup.set(file.path, file);
  });
  return Array.from(dedup.values());
};
