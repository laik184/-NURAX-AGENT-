export interface EnvironmentCheckResult {
  hasEnvironmentIssue: boolean;
  missingEnvKeys: string[];
}

const extractEnvReference = (line: string): string[] => {
  const matches = line.match(/process\.env\.([A-Z0-9_]+)/g);
  if (!matches) {
    return [];
  }

  return matches.map((value) => value.split('.').pop() ?? '').filter(Boolean);
};

export const environmentCheckerAgent = (
  error: string,
  logs: string[],
  environment: Record<string, string | undefined> = {},
): EnvironmentCheckResult => {
  const text = [error, ...logs].join('\n');
  const referencedKeys = extractEnvReference(text);

  const missingEnvKeys = referencedKeys.filter((key) => !environment[key]);
  const explicitMissing = /missing env|environment variable/i.test(text);

  return {
    hasEnvironmentIssue: explicitMissing || missingEnvKeys.length > 0,
    missingEnvKeys: [...new Set(missingEnvKeys)],
  };
};
