export function sectionTemplate(label: string, content: string): string {
  return [`<${label}>`, content, `</${label}>`].join("\n");
}

export function joinBlocks(blocks: readonly string[]): string {
  return blocks.filter(Boolean).join("\n\n").trim();
}
