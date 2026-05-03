export const toEnvLine = (key: string, value: string): string => `${key}=${JSON.stringify(value)}`;

export const indentLines = (input: string, spaces = 2): string => {
  const indent = ' '.repeat(spaces);
  return input
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
};
