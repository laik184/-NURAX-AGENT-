import { secretsService } from '../../../../../services/index.js';

export const loadExistingEnv = async (filePath: string): Promise<Record<string, string>> => {
  const redacted = await secretsService.readEnvFileRedacted(filePath);
  return { ...redacted.redacted };
};
