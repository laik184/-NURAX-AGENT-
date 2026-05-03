import { fileSystemService } from "../../../../../services/index.js";
import { withFileLock } from "../utils/file-lock.util.js";

export const deleteFile = async (filePath: string): Promise<void> => {
  await withFileLock(filePath, async () => {
    await fileSystemService.deleteFile(filePath);
  });
};
