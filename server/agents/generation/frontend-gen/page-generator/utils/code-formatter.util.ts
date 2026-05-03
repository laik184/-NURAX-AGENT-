export function formatCode(source: string): string {
  const lines = source.split('\n').map(line => line.replace(/[ \t]+$/g, ''));
  return `${lines.join('\n').trim()}\n`;
}
