import type { DependencyGraph, EmbeddingVector, FileMeta, IndexedSymbolRef, SearchableIndex, SymbolMeta } from '../types.js';

export interface IndexBuilderInput {
  readonly files: readonly FileMeta[];
  readonly symbols: readonly SymbolMeta[];
  readonly dependencies: DependencyGraph;
  readonly embeddings: readonly EmbeddingVector[];
}

export function buildSearchableIndex(input: IndexBuilderInput): SearchableIndex {
  const byFile = input.files.reduce<Record<string, FileMeta>>((acc, file) => {
    acc[file.path] = file;
    return acc;
  }, {});

  const bySymbol = input.symbols.reduce<Record<string, IndexedSymbolRef[]>>((acc, symbol) => {
    const key = symbol.name.toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push({
      filePath: symbol.filePath,
      line: symbol.line,
      kind: symbol.kind,
    });

    return acc;
  }, {});

  Object.values(bySymbol).forEach((entries) =>
    entries.sort((left, right) => left.filePath.localeCompare(right.filePath) || left.line - right.line),
  );

  const embeddings = input.embeddings.reduce<Record<string, EmbeddingVector[]>>((acc, vector) => {
    if (!acc[vector.filePath]) {
      acc[vector.filePath] = [];
    }
    acc[vector.filePath].push(vector);
    return acc;
  }, {});

  return Object.freeze({
    byFile: Object.freeze(byFile),
    bySymbol: Object.freeze(
      Object.fromEntries(Object.entries(bySymbol).map(([name, refs]) => [name, Object.freeze(refs)])),
    ),
    dependencies: input.dependencies,
    embeddings: Object.freeze(
      Object.fromEntries(Object.entries(embeddings).map(([filePath, refs]) => [filePath, Object.freeze(refs)])),
    ),
  });
}
