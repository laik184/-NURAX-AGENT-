import { fileExists, writeTextFile } from '../utils/file-writer.util.js';
import { sanitizeEnvValue } from '../utils/value-sanitizer.util.js';

const toEnvContent = (env: Record<string, string>): string => {
  const lines = Object.keys(env)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${sanitizeEnvValue(env[key] ?? '')}`);

  return `${lines.join('\n')}\n`;
};

export const generateEnvFile = async (
  filePath: string,
  env: Record<string, string>,
): Promise<{ created: boolean; updated: boolean }> => {
  const exists = await fileExists(filePath);
  const content = toEnvContent(env);

  await writeTextFile(filePath, content);

  return {
    created: !exists,
    updated: true,
  };
};
