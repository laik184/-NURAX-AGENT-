export function tokenize(content: string): readonly string[] {
  const normalized = content.trim();
  if (!normalized) {
    return Object.freeze([]);
  }

  const tokens = normalized.split(/\s+/u).filter(Boolean);
  return Object.freeze(tokens);
}

export function countTokens(content: string): number {
  return tokenize(content).length;
}
