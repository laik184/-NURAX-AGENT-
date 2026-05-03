import type { ContextSourceFile } from "../types.js";
import { normalizePath, resolveImportPath } from "../utils/path-resolver.util.js";

const IMPORT_STATEMENT_PATTERN = /from\s+["']([^"']+)["']/g;

function extractImports(content: string): readonly string[] {
  const imports = new Set<string>();
  const matches = content.matchAll(IMPORT_STATEMENT_PATTERN);

  for (const match of matches) {
    const importPath = match[1]?.trim();
    if (importPath) imports.add(importPath);
  }

  return Object.freeze([...imports]);
}

export function expandDependencies(
  selectedFiles: readonly ContextSourceFile[],
  allFiles: readonly ContextSourceFile[],
): readonly ContextSourceFile[] {
  const fileByPath = new Map(allFiles.map((file) => [normalizePath(file.path), file]));
  const expandedByPath = new Map(selectedFiles.map((file) => [normalizePath(file.path), file]));

  for (const file of selectedFiles) {
    const imports = extractImports(file.content);
    for (const importedPath of imports) {
      const resolvedPath = resolveImportPath(file.path, importedPath);
      const dependency = fileByPath.get(resolvedPath);
      if (dependency && !expandedByPath.has(resolvedPath)) {
        expandedByPath.set(resolvedPath, dependency);
      }
    }
  }

  return Object.freeze([...expandedByPath.values()]);
}
