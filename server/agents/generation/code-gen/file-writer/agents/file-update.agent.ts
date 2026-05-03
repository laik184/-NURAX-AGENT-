import { fileSystemService } from "../../../../../services/index.js";
import { normalizeContent } from "../utils/content-normalizer.util.js";
import { hasContentDiff } from "../utils/diff.util.js";
import { withFileLock } from "../utils/file-lock.util.js";

export const updateFile = async (filePath: string, nextContent: string): Promise<boolean> => {
  return await withFileLock(filePath, async () => {
    const currentContent = await fileSystemService.readFile(filePath, "utf8");
    const normalizedNextContent = normalizeContent(nextContent);

    if (!hasContentDiff(currentContent, normalizedNextContent)) {
      return false;
    }

    await fileSystemService.writeFileAtomic(filePath, normalizedNextContent);
    return true;
  });
};
