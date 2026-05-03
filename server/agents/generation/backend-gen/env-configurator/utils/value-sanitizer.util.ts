export const sanitizeEnvValue = (value: string): string => {
  const trimmed = value.trim();
  const escaped = trimmed.replace(/\r?\n/g, '');

  if (/\s|#|=/.test(escaped)) {
    const quoted = escaped.replace(/"/g, '\\"');
    return `"${quoted}"`;
  }

  return escaped;
};

export const stripWrappingQuotes = (value: string): string => {
  const trimmed = value.trim();

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};
