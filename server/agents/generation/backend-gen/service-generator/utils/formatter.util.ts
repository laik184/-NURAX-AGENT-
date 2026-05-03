export const formatterUtil = {
  toCodeBlock(lines: string[]): string {
    return lines
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .concat('\n');
  },
};
