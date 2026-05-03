export interface AstScanResult {
  readonly exportedSymbols: readonly string[];
  readonly removedExports: readonly string[];
}

export function scanSymbols(lines: readonly string[]): AstScanResult {
  const exportedSymbols = new Set<string>();
  const removedExports = new Set<string>();

  for (const line of lines) {
    const exportMatch = line.match(/^\s*export\s+(?:const|function|class|type|interface)\s+([A-Za-z0-9_]+)/);
    if (exportMatch?.[1]) exportedSymbols.add(exportMatch[1]);

    const removedMatch = line.match(/^\s*-\s*export\s+(?:const|function|class|type|interface)\s+([A-Za-z0-9_]+)/);
    if (removedMatch?.[1]) removedExports.add(removedMatch[1]);
  }

  return Object.freeze({
    exportedSymbols: Object.freeze([...exportedSymbols]),
    removedExports: Object.freeze([...removedExports]),
  });
}
