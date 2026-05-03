export function chunkTextByLines(text: string, maxCharsPerChunk: number): readonly string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');

  let current = '';
  for (const line of lines) {
    const withLine = current.length === 0 ? line : `${current}\n${line}`;
    if (withLine.length > maxCharsPerChunk && current.length > 0) {
      chunks.push(current);
      current = line;
      continue;
    }
    current = withLine;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return Object.freeze(chunks);
}
