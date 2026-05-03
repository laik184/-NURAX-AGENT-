export const normalizeContent = (content: string): string => {
  const normalizedLineBreaks = content.replace(/\r\n/g, "\n");
  return normalizedLineBreaks.endsWith("\n")
    ? normalizedLineBreaks
    : `${normalizedLineBreaks}\n`;
};
