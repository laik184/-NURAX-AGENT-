export function indentBlock(code: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => (line.trim().length > 0 ? `${pad}${line}` : line))
    .join("\n");
}

export function normalizeCode(code: string): string {
  return `${code.trim()}\n`;
}
