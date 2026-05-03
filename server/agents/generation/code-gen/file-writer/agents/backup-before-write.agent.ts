import { fileSystemService } from "../../../../../services/index.js";

export const createBackupBeforeWrite = async (filePath: string): Promise<string> => {
  const backupPath = `${filePath}.bak.${Date.now()}`;
  await fileSystemService.copyFile(filePath, backupPath);
  return backupPath;
};
