export type IndexingStatus = 'IDLE' | 'SCANNING' | 'INDEXING' | 'COMPLETE' | 'FAILED';

export interface FileMeta {
  readonly path: string;
  readonly extension: string;
  readonly size: number;
  readonly hash: string;
  readonly lastModifiedMs: number;
  readonly changed: boolean;
}

export type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'method';

export interface SymbolMeta {
  readonly filePath: string;
  readonly name: string;
  readonly kind: SymbolKind;
  readonly line: number;
  readonly exported: boolean;
  readonly signature?: string;
}

export interface FileDependency {
  readonly imports: readonly string[];
  readonly exports: readonly string[];
}

export type DependencyGraph = Readonly<Record<string, FileDependency>>;

export interface EmbeddingVector {
  readonly id: string;
  readonly filePath: string;
  readonly chunkIndex: number;
  readonly text: string;
  readonly vector: readonly number[];
}

export interface IndexedSymbolRef {
  readonly filePath: string;
  readonly line: number;
  readonly kind: SymbolKind;
}

export interface SearchableIndex {
  readonly byFile: Readonly<Record<string, FileMeta>>;
  readonly bySymbol: Readonly<Record<string, readonly IndexedSymbolRef[]>>;
  readonly dependencies: DependencyGraph;
  readonly embeddings: Readonly<Record<string, readonly EmbeddingVector[]>>;
}

export interface IndexResult {
  readonly success: boolean;
  readonly filesIndexed: number;
  readonly symbolsExtracted: number;
  readonly indexSize: number;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface ParsedFile {
  readonly file: FileMeta;
  readonly sourceText: string;
  readonly ast: import('typescript').SourceFile;
}
