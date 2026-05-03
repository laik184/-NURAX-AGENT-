import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const writeTextFile = async (filePath: string, content: string): Promise<void> => {
  const parent = path.dirname(filePath);
  await mkdir(parent, { recursive: true });
  await writeFile(filePath, content, { encoding: 'utf8' });
};

export const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};
