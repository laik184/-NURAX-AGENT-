export function splitText(text: string, chunkSize: number, overlap: number): readonly string[] {
  if (!text.trim()) {
    return Object.freeze([]);
  }

  const safeChunkSize = Math.max(1, chunkSize);
  const safeOverlap = Math.max(0, Math.min(overlap, safeChunkSize - 1));
  const step = Math.max(1, safeChunkSize - safeOverlap);

  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += step) {
    const slice = text.slice(index, index + safeChunkSize).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }
  }

  return Object.freeze(chunks);
}
