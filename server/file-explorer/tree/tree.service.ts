import fs from 'fs';
import path from 'path';
import type {
  RawTreeNode, NodeType, ListTreeInput, ListTreeResult,
  FlatFileEntry, FlattenResult, TreeServiceConfig, SortOrder,
} from './tree.types.ts';

const DEFAULT_CONFIG: TreeServiceConfig = {
  maxDepth: 10,
  excludePatterns: ['node_modules', '.git', 'dist', '.cache', '__pycache__', '.next', 'coverage'],
  includeHidden: false,
  followSymlinks: false,
};

function guessLang(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith('.tsx') || n.endsWith('.ts')) return 'typescript';
  if (n.endsWith('.jsx') || n.endsWith('.js')) return 'javascript';
  if (n.endsWith('.css') || n.endsWith('.scss')) return 'css';
  if (n.endsWith('.html')) return 'html';
  if (n.endsWith('.json')) return 'json';
  if (n.endsWith('.md')) return 'markdown';
  if (n.endsWith('.py')) return 'python';
  if (n.endsWith('.rs')) return 'rust';
  if (n.endsWith('.go')) return 'go';
  return 'plaintext';
}

export class TreeService {
  private config: TreeServiceConfig;

  constructor(config?: Partial<TreeServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  list(input: ListTreeInput): ListTreeResult {
    const { projectPath, depth, includeHidden, sortBy = 'name-asc' } = input;

    try {
      const absRoot = path.resolve(projectPath);
      if (!fs.existsSync(absRoot)) {
        return { ok: false, tree: [], total: 0, projectPath, error: `Path not found: ${projectPath}` };
      }

      const stat = fs.statSync(absRoot);
      if (!stat.isDirectory()) {
        return { ok: false, tree: [], total: 0, projectPath, error: `Not a directory: ${projectPath}` };
      }

      const maxDepth = depth ?? this.config.maxDepth;
      const hidden = includeHidden ?? this.config.includeHidden;
      const tree = this.buildTree(absRoot, absRoot, 0, maxDepth, hidden, sortBy);
      const total = this.countNodes(tree);

      return { ok: true, tree, total, projectPath };
    } catch (e: any) {
      return { ok: false, tree: [], total: 0, projectPath, error: e.message };
    }
  }

  flatten(projectPath: string): FlattenResult {
    const result = this.list({ projectPath });
    if (!result.ok) return { ok: false, files: [], total: 0, error: result.error };

    const files = this.flattenNodes(result.tree);
    return { ok: true, files, total: files.length };
  }

  exists(filePath: string): boolean {
    return fs.existsSync(path.resolve(filePath));
  }

  isDirectory(filePath: string): boolean {
    try {
      return fs.statSync(path.resolve(filePath)).isDirectory();
    } catch {
      return false;
    }
  }

  private buildTree(
    absPath: string,
    root: string,
    currentDepth: number,
    maxDepth: number,
    includeHidden: boolean,
    sortBy: SortOrder,
  ): RawTreeNode[] {
    if (currentDepth >= maxDepth) return [];

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absPath, { withFileTypes: true });
    } catch {
      return [];
    }

    const nodes: RawTreeNode[] = [];

    for (const entry of entries) {
      if (!includeHidden && entry.name.startsWith('.')) continue;
      if (this.isExcluded(entry.name)) continue;

      const absEntry = path.join(absPath, entry.name);
      const relPath = path.relative(root, absEntry);

      let stat: fs.Stats | null = null;
      try { stat = fs.statSync(absEntry); } catch { continue; }

      const isDir = entry.isDirectory() || (this.config.followSymlinks && entry.isSymbolicLink() && stat.isDirectory());

      if (isDir) {
        const children = this.buildTree(absEntry, root, currentDepth + 1, maxDepth, includeHidden, sortBy);
        nodes.push({ name: entry.name, path: relPath, type: 'folder', modifiedAt: stat.mtime, children });
      } else {
        nodes.push({
          name: entry.name, path: relPath, type: 'file',
          size: stat.size, modifiedAt: stat.mtime,
          lang: guessLang(entry.name), children: [],
        });
      }
    }

    return this.sort(nodes, sortBy);
  }

  private sort(nodes: RawTreeNode[], order: SortOrder): RawTreeNode[] {
    return [...nodes].sort((a, b) => {
      const aDir = a.type === 'folder' ? 0 : 1;
      const bDir = b.type === 'folder' ? 0 : 1;
      if (aDir !== bDir) return aDir - bDir;

      switch (order) {
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'modified-asc': return (a.modifiedAt?.getTime() ?? 0) - (b.modifiedAt?.getTime() ?? 0);
        case 'modified-desc': return (b.modifiedAt?.getTime() ?? 0) - (a.modifiedAt?.getTime() ?? 0);
        case 'size-asc': return (a.size ?? 0) - (b.size ?? 0);
        default: return a.name.localeCompare(b.name);
      }
    });
  }

  private flattenNodes(nodes: RawTreeNode[], result: FlatFileEntry[] = []): FlatFileEntry[] {
    for (const node of nodes) {
      if (node.type === 'file') {
        result.push({ name: node.name, path: node.path, size: node.size, lang: node.lang, modifiedAt: node.modifiedAt });
      }
      if (node.children?.length) this.flattenNodes(node.children, result);
    }
    return result;
  }

  private isExcluded(name: string): boolean {
    return this.config.excludePatterns.includes(name);
  }

  private countNodes(nodes: RawTreeNode[]): number {
    return nodes.reduce((acc, n) => acc + 1 + this.countNodes(n.children ?? []), 0);
  }
}

export const treeService = new TreeService();
