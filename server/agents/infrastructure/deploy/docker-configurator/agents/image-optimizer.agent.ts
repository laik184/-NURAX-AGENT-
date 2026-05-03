export const optimizeDockerfileLayers = (dockerfile: string): string => {
  const sanitized = dockerfile.replace(/\n{3,}/g, '\n\n').trim();
  if (!sanitized.endsWith('\n')) {
    return `${sanitized}\n`;
  }

  return sanitized;
};
