import { fileSystemService } from "../../../../../services/index.js";

export const checkFileExists = async (filePath: string): Promise<boolean> => {
  return await fileSystemService.exists(filePath);
};
