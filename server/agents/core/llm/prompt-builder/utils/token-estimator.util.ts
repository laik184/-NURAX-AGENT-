export function estimateTokens(content: string): number {
  const cleaned = content.trim();
  if (!cleaned) return 0;

  const wordCount = cleaned.split(/\s+/).length;
  const punctuationCount = (cleaned.match(/[.,;:!?()[\]{}]/g) ?? []).length;
  return Math.ceil(wordCount * 1.25 + punctuationCount * 0.15);
}
