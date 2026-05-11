import fs from 'fs';
import path from 'path';
import type {
  SearchQuery, SearchResult, SearchMatch, SearchResponse,
  SearchIndex, FlatIndexEntry, SearchServiceConfig, SearchMode,
} from './search.types.ts';

const DEFAULT_CONFIG: SearchServiceConfig = {
  maxResults: 100,
  maxContentSizeBytes: 500 * 1024,
  excludePatterns: ['node_modules', '.git', 'dist', '.cache', '.next', 'coverage'],
  indexTtlMs: 30_000,
};

function guessLang(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith('.tsx') || n.endsWith('.ts')) return 'typescript';
  if (n.endsWith('.jsx') || n.endsWith('.js')) return 'javascript';
  if (n.endsWith('.css')) return 'css';
  if (n.endsWith('.html')) return 'html';
  if (n.endsWith('.json')) return 'json';
  if (n.endsWith('.md')) return 'markdown';
  if (n.endsWith('.py')) return 'python';
  return 'plaintext';
}

export class SearchService {
  private config: SearchServiceConfig;
  private indexCache = new Map<string, SearchIndex>();

  constructor(config?: Partial<SearchServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async search(query: SearchQuery): Promise<SearchResponse> {
    const startMs = Date.now();
    const {
      q, projectPath, mode = 'both',
      caseSensitive = false, maxResults, fileTypes,
    } = query;

    if (!q.trim()) {
      return { ok: true, query: q, projectPath, mode, results: [], total: 0, truncated: false, durationMs: 0 };
    }

    const limit = maxResults ?? this.config.maxResults;
    const needle = caseSensitive ? q : q.toLowerCase();

    try {
      const index = await this.buildIndex(projectPath);
      let candidates = index.files;

      if (fileTypes?.length) {
        candidates = candidates.filter(f => fileTypes.some(ext => f.name.endsWith(ext)));
      }

      const results: SearchResult[] = [];

      for (const entry of candidates) {
        if (results.length >= limit) break;

        const nameHit = mode !== 'content' && this.matchName(entry.name, needle, caseSensitive);
        const contentMatches = mode !== 'name' ? this.searchContent(entry, needle, caseSensitive, projectPath) : [];

        if (nameHit || contentMatches.length > 0) {
          results.push({
            name: entry.name,
            path: entry.path,
            type: 'file',
            lang: entry.lang,
            matches: contentMatches,
            matchCount: contentMatches.length,
            score: nameHit ? 10 + contentMatches.length : contentMatches.length,
          });
        }
      }

      results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      return {
        ok: true, query: q, projectPath, mode,
        results: results.slice(0, limit),
        total: results.length,
        truncated: results.length >= limit,
        durationMs: Date.now() - startMs,
      };
    } catch (e: any) {
      return { ok: false, query: q, projectPath, mode, results: [], total: 0, truncated: false, durationMs: Date.now() - startMs, error: e.message };
    }
  }

  invalidateIndex(projectPath: string): void {
    this.indexCache.delete(projectPath);
  }

  private matchName(name: string, needle: string, caseSensitive: boolean): boolean {
    const haystack = caseSensitive ? name : name.toLowerCase();
    return haystack.includes(needle);
  }

  private searchContent(entry: FlatIndexEntry, needle: string, caseSensitive: boolean, projectPath: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    try {
      const abs = path.resolve(projectPath, entry.path);
      if (!fs.existsSync(abs)) return matches;

      const stat = fs.statSync(abs);
      if (stat.size > this.config.maxContentSizeBytes) return matches;

      const content = fs.readFileSync(abs, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const searchLine = caseSensitive ? line : line.toLowerCase();
        const idx = searchLine.indexOf(needle);
        if (idx !== -1) {
          matches.push({
            lineNumber: i + 1,
            lineContent: line.slice(0, 200),
            matchStart: idx,
            matchEnd: idx + needle.length,
          });
          if (matches.length >= 5) break;
        }
      }
    } catch {}
    return matches;
  }

  private async buildIndex(projectPath: string): Promise<SearchIndex> {
    const cached = this.indexCache.get(projectPath);
    if (cached && Date.now() - cached.builtAt.getTime() < this.config.indexTtlMs) {
      return cached;
    }

    const files: FlatIndexEntry[] = [];
    this.walkDir(path.resolve(projectPath), path.resolve(projectPath), files);

    const index: SearchIndex = { projectPath, files, builtAt: new Date() };
    this.indexCache.set(projectPath, index);
    return index;
  }

  private walkDir(absDir: string, root: string, out: FlatIndexEntry[]): void {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(absDir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (this.config.excludePatterns.includes(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const absPath = path.join(absDir, entry.name);
      const relPath = path.relative(root, absPath);

      if (entry.isDirectory()) {
        this.walkDir(absPath, root, out);
      } else {
        try {
          const stat = fs.statSync(absPath);
          out.push({ name: entry.name, path: relPath, lang: guessLang(entry.name), size: stat.size });
        } catch {}
      }
    }
  }
}

export const searchService = new SearchService();
