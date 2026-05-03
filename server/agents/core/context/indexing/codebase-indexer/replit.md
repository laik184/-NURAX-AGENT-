# Codebase Indexer (HVP)

## 1) Indexing Flow

The indexer runs a strict orchestrated pipeline with no business logic inside the orchestrator other than delegation and state transitions:

```text
index.ts
  ↓
orchestrator.ts
  ↓
file-scanner.agent.ts
  ↓
ast-parser.agent.ts
  ↓
symbol-extractor.agent.ts
  ↓
dependency-mapper.agent.ts
  ↓
embedding-generator.agent.ts
  ↓
index-builder.agent.ts
  ↓
IndexResult (frozen)
```

## 2) File Responsibilities

| File | Responsibility |
|------|----------------|
| `types.ts` | Canonical type contracts (`FileMeta`, `SymbolMeta`, `DependencyGraph`, `EmbeddingVector`, `IndexResult`). |
| `state.ts` | Immutable in-memory state with controlled `get/set/reset` APIs. |
| `orchestrator.ts` | Coordinates full flow and is the only place that updates state status. |
| `agents/file-scanner.agent.ts` | Recursively scans repository, filters files, computes hashes, marks changed files. |
| `agents/ast-parser.agent.ts` | Parses JS/TS files into TypeScript AST nodes. |
| `agents/symbol-extractor.agent.ts` | Extracts functions/classes/interfaces/types/enums/methods. |
| `agents/dependency-mapper.agent.ts` | Builds import/export dependency graph from AST. |
| `agents/embedding-generator.agent.ts` | Chunks file text and produces deterministic embedding vectors. |
| `agents/index-builder.agent.ts` | Merges files/symbols/dependencies/embeddings into searchable index maps. |
| `utils/path-resolver.util.ts` | Root path and normalized path helpers. |
| `utils/file-filter.util.ts` | Extension-based source allowlist + binary/ignore directory filtering. |
| `utils/hash.util.ts` | Stable SHA-256 content hashing helper. |
| `utils/chunker.util.ts` | Line-based chunking for large file embedding preparation. |
| `utils/logger.util.ts` | Timestamped log/error helpers. |
| `index.ts` | Public APIs: `buildIndex()`, `updateIndex()`, `getIndex()`. |

## 3) Import Relationships (HVP)

Allowed:

- `orchestrator.ts` → `agents/*`
- `orchestrator.ts` → `state.ts`, `types.ts`, `utils/*`
- `agents/*` → `types.ts`, `utils/*`
- `index.ts` → `orchestrator.ts`, `state.ts`, `types.ts`

Forbidden:

- agent → agent imports
- orchestrator direct filesystem parsing/scanning logic
- utils importing agents/orchestrator

## 4) Example Index Output

```ts
{
  success: true,
  filesIndexed: 412,
  symbolsExtracted: 1290,
  indexSize: 412,
  logs: [
    "[2026-04-09T10:00:00.000Z] orchestrator:start root=/workspace/BACKEND-X-AGENT",
    "[2026-04-09T10:00:00.200Z] file-scanner:files=412",
    "[2026-04-09T10:00:01.100Z] ast-parser:parsed=412"
  ]
}
```

All output objects from the orchestrator are `Object.freeze(...)` protected.

## 5) How LLM Uses This

1. `buildIndex()` creates file-level + symbol-level + dependency + embedding views.
2. Retrieval first resolves candidate files by symbol names or dependency adjacency.
3. Embedding vectors are used for semantic nearest-neighbor ranking over chunk text.
4. Returned chunks are fed to context assembly for downstream reasoning.
5. `updateIndex()` reuses hash comparison to identify changed files and support incremental indexing behavior.
