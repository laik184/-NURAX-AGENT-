export type NodeType = 'file' | 'folder' | 'directory';
export type SortOrder = 'name-asc' | 'name-desc' | 'modified-asc' | 'modified-desc' | 'size-asc';

export interface RawTreeNode {
  name: string;
  path: string;
  type: NodeType;
  size?: number;
  modifiedAt?: Date;
  lang?: string;
  optimistic?: boolean;
  children?: RawTreeNode[];
}

export interface ListTreeInput {
  projectPath: string;
  depth?: number;
  includeHidden?: boolean;
  sortBy?: SortOrder;
}

export interface ListTreeResult {
  ok: boolean;
  tree: RawTreeNode[];
  total: number;
  projectPath: string;
  error?: string;
}

export interface FlatFileEntry {
  name: string;
  path: string;
  size?: number;
  lang?: string;
  modifiedAt?: Date;
}

export interface FlattenResult {
  ok: boolean;
  files: FlatFileEntry[];
  total: number;
  error?: string;
}

export interface TreeServiceConfig {
  maxDepth: number;
  excludePatterns: string[];
  includeHidden: boolean;
  followSymlinks: boolean;
}
