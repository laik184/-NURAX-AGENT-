import { stripWrappingQuotes } from './value-sanitizer.util.js';

export const parseEnvContent = (content: string): Record<string, string> => {
  const env: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);

    if (!key) {
      continue;
    }

    env[key] = stripWrappingQuotes(value);
  }

  return env;
};
