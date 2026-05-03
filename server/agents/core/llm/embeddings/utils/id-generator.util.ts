function toHex(input: number): string {
  return Math.abs(input >>> 0).toString(16).padStart(8, '0');
}

export function generateId(prefix: string, content: string, index: number): string {
  const seed = `${prefix}:${index}:${content}`;
  let hash = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return `${prefix}_${toHex(hash)}_${index}`;
}
