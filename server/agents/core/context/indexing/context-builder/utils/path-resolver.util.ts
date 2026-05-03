import path from "node:path";

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

export function resolveImportPath(baseFilePath: string, importPath: string): string {
  if (!importPath.startsWith(".")) return normalizePath(importPath);

  const baseDirectory = path.posix.dirname(normalizePath(baseFilePath));
  const resolved = path.posix.normalize(path.posix.join(baseDirectory, importPath));
  return normalizePath(resolved.endsWith(".ts") || resolved.endsWith(".js") ? resolved : `${resolved}.ts`);
}
