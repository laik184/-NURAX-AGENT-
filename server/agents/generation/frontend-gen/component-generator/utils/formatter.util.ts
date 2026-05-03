export function formatCode(source: string): string {
  const normalized = source.replace(/\r\n/g, "\n").trim();
  return `${normalized}\n`;
}
