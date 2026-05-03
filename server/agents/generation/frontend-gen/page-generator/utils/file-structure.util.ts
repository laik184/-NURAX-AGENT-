import type { GeneratedFile } from '../types';

export function upsertFile(files: GeneratedFile[], file: GeneratedFile): GeneratedFile[] {
  const next = files.filter(existing => existing.path !== file.path);
  next.push(file);
  return next;
}
