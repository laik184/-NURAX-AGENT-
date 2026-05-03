export const normalizeGitError = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const candidate = error as { stderr?: string; message?: string };
    if (candidate.stderr && candidate.stderr.trim()) {
      return candidate.stderr.trim();
    }
    if (candidate.message && candidate.message.trim()) {
      return candidate.message.trim();
    }
  }

  return 'Unknown git error';
};
