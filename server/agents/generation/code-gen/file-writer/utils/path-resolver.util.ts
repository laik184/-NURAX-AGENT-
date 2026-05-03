import path from "node:path";

const INVALID_PATH_TOKENS = ["\0"];

export const resolveSafePath = (targetPath: string): string => {
  if (typeof targetPath !== "string" || targetPath.trim().length === 0) {
    throw new Error("Path must be a non-empty string.");
  }

  for (const token of INVALID_PATH_TOKENS) {
    if (targetPath.includes(token)) {
      throw new Error("Path contains invalid characters.");
    }
  }

  const normalizedPath = path.normalize(targetPath);
  if (normalizedPath.includes(`..${path.sep}`) || normalizedPath === "..") {
    throw new Error("Directory traversal attempt blocked.");
  }

  return path.resolve(process.cwd(), normalizedPath);
};
