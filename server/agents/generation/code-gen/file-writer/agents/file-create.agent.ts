import { fileSystemService } from "../../../../../services/index.js";
import { withFileLock } from "../utils/file-lock.util.js";
import { normalizeContent } from "../utils/content-normalizer.util.js";

export const createFile = async (filePath: string, content: string): Promise<void> => {
  await withFileLock(filePath, async () => {
    await fileSystemService.createFileExclusive(filePath, normalizeContent(content));
  });
};
