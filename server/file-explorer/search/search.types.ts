export type SearchMode = 'name' | 'content' | 'both';

export interface SearchQuery {
  q: string;
  projectPath: string;
  mode?: SearchMode;
  caseSensitive?: boolean;
  maxResults?: number;
  fileTypes?: string[];
}

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchResult {
  name: string;
  path: string;
  type: 'file' | 'folder';
  lang?: string;
  matches?: SearchMatch[];
  matchCount?: number;
  score?: number;
}

export interface SearchResponse {
  ok: boolean;
  query: string;
  projectPath: string;
  mode: SearchMode;
  results: SearchResult[];
  total: number;
  truncated: boolean;
  durationMs: number;
  error?: string;
}

export interface SearchIndex {
  projectPath: string;
  files: FlatIndexEntry[];
  builtAt: Date;
}

export interface FlatIndexEntry {
  name: string;
  path: string;
  lang?: string;
  size?: number;
}

export interface SearchServiceConfig {
  maxResults: number;
  maxContentSizeBytes: number;
  excludePatterns: string[];
  indexTtlMs: number;
}
