# patch-engine

## Purpose

A pure, deterministic code transformation engine that applies targeted patches to
source code strings. It accepts source code as a string input and returns an
immutable `PatchResult` containing the transformed code, a structured diff, and
metadata — with zero side effects and no external dependencies.

---

## What It Does

- Converts synchronous blocking calls to async/await equivalents (`ASYNC_REFACTOR`)
- Wraps cacheable operations (HTTP fetches, DB queries, computed results) with an in-memory TTL cache (`CACHE_INJECTION`)
- Replaces Node.js sync FS/crypto/child-process calls with async alternatives (`SYNC_REDUCTION`)
- Wraps heavy compute blocks in a Worker Thread scaffold (`WORKER_THREAD_INJECTION`)
- Injects field-filter helpers and compression hints for large JSON responses (`PAYLOAD_OPTIMIZATION`)
- Produces a line-by-line diff (added / removed / unchanged) via LCS algorithm
- Chains multiple patches sequentially on a single code string (`applyBatchPatch`)
- Tracks session history in-memory with bounded ring-buffer (max 200 records)
- Returns all outputs deeply frozen — fully immutable

## What It Does NOT Do

- Does NOT detect problems — it only applies pre-selected patch types
- Does NOT read from or write to the filesystem
- Does NOT execute code or spawn processes
- Does NOT call git, runtime, or deployment layers
- Does NOT modify global state outside the bounded in-memory session store
- Does NOT restart processes
- Does NOT communicate with external APIs or services
- Does NOT plan which patches to apply — that is the caller's responsibility

---

## File-by-File Responsibility

| File | Responsibility |
|---|---|
| `types.ts` | All shared types: `PatchType`, `PatchResult`, `DiffResult`, `DiffLine`, `PatchSession`, scoring sentinels |
| `state.ts` | Bounded in-memory session store and transformation history — no patch module imports |
| `utils/ast.helper.ts` | Pattern detectors: sync FS, crypto, child process, heavy loops, callbacks, promise chains, large responses |
| `utils/string.transformer.ts` | Pure string transformations: async wrapping, worker scaffold, cache layer injection, field filter injection |
| `utils/validation.helper.ts` | Input validators for `PatchRequest` and `BatchPatchRequest` with typed `ValidationResult` |
| `async-refactor.patch.ts` | Applies async refactor: replaces sync calls, unwraps callback/promise chains, ensures `async` keyword |
| `cache-injector.patch.ts` | Detects cacheable patterns, derives cache key, injects TTL cache wrapper |
| `sync-reducer.patch.ts` | Detects sync blocking calls, injects required imports, replaces with async equivalents |
| `worker-thread-injector.patch.ts` | Detects heavy compute (loops, crypto, regex, image, math), wraps in `worker_threads` scaffold |
| `payload-optimizer.patch.ts` | Detects large response patterns, injects field filter helper and compression hint |
| `diff.builder.ts` | LCS-based diff engine — produces `DiffResult` with per-line `added/removed/unchanged` hunks |
| `orchestrator.ts` | Level 1 coordinator — dispatches to patch modules, manages sessions, chains batch patches |
| `index.ts` | Public API surface — re-exports types and orchestrator functions only |

---

## HVP Layer Diagram

```
Level 1 — Orchestration
└── orchestrator.ts

Level 2 — Patch Modules
├── async-refactor.patch.ts
├── cache-injector.patch.ts
├── sync-reducer.patch.ts
├── worker-thread-injector.patch.ts
└── payload-optimizer.patch.ts

Also Level 2:
└── diff.builder.ts

Level 3 — Utilities (leaf nodes)
└── utils/
    ├── ast.helper.ts
    ├── string.transformer.ts
    └── validation.helper.ts
```

---

## Call Hierarchy Diagram

```
index.ts
   │  (re-exports only)
   ▼
orchestrator.ts
   │
   ├─► validatePatchRequest(req)        ← utils/validation.helper.ts
   │
   ├─► dispatchPatch(id, code, type)
   │       ├── applyAsyncRefactor()     ← async-refactor.patch.ts
   │       │     ├── hasSyncBlockingCalls() / hasCallbacks() / hasPromiseChains()
   │       │     │                      ← utils/ast.helper.ts
   │       │     └── replaceSyncWithAsync() / ensureAsyncKeyword()
   │       │                            ← utils/string.transformer.ts
   │       │
   │       ├── applyCacheInjection()    ← cache-injector.patch.ts
   │       │     └── wrapInCacheLayer() ← utils/string.transformer.ts
   │       │
   │       ├── applySyncReduction()     ← sync-reducer.patch.ts
   │       │     └── replaceSyncWithAsync() ← utils/string.transformer.ts
   │       │
   │       ├── applyWorkerThreadInjection() ← worker-thread-injector.patch.ts
   │       │     └── wrapInWorkerThread()   ← utils/string.transformer.ts
   │       │
   │       └── applyPayloadOptimization() ← payload-optimizer.patch.ts
   │             ├── addPayloadFieldFilter()    ← utils/string.transformer.ts
   │             └── injectCompressionHint()    ← utils/string.transformer.ts
   │
   ├─► buildDiff(original, patched)     ← diff.builder.ts
   │
   └─► return frozen PatchResult
```

---

## Import Direction Rules

```
ALLOWED:
index                → orchestrator, types
orchestrator         → *.patch.ts, diff.builder, state, types, utils/validation.helper
*.patch.ts           → utils/ast.helper, utils/string.transformer, diff.builder, types
diff.builder         → types

FORBIDDEN:
*.patch.ts   → *.patch.ts    (no cross-patch imports)
state        → *.patch.ts    (state imports only types)
utils        → *.patch.ts    (leaf nodes — pure functions only)
any file     → orchestrator  (only index may reference orchestrator)
```

---

## Example Usage

### Single patch

```typescript
import { applyPatch } from "./patch-engine/index.js";

const result = applyPatch({
  code: `const data = fs.readFileSync('/tmp/data.json', 'utf8');`,
  patchType: "SYNC_REDUCTION",
  targetHint: null,
});

console.log(result.status);      // "SUCCESS"
console.log(result.patchedCode); // uses await fs.promises.readFile(...)
console.log(result.diffSummary.linesAdded);
```

### Batch patch (sequential pipeline)

```typescript
import { applyBatchPatch } from "./patch-engine/index.js";

const result = applyBatchPatch({
  code: `
    const raw = fs.readFileSync('/tmp/users.json', 'utf8');
    const users = JSON.parse(raw);
    res.json(users);
  `,
  patchTypes: ["SYNC_REDUCTION", "CACHE_INJECTION", "PAYLOAD_OPTIMIZATION"],
});

console.log(result.finalCode);        // fully transformed code
console.log(result.results.length);   // 3 PatchResult entries
```

---

## Example Patch Transformation

### Input (ASYNC_REFACTOR)
```javascript
function getData() {
  const content = fs.readFileSync('/data/config.json', 'utf8');
  return JSON.parse(content);
}
```

### Output
```javascript
async function getData() {
  const content = await fs.promises.readFile('/data/config.json', 'utf8');
  return JSON.parse(content);
}
```

### DiffResult
```json
{
  "linesAdded": 2,
  "linesRemoved": 2,
  "linesChanged": 2,
  "hunks": [
    { "lineNumber": 1, "kind": "removed", "content": "function getData() {" },
    { "lineNumber": 2, "kind": "added",   "content": "async function getData() {" },
    { "lineNumber": 3, "kind": "removed", "content": "  const content = fs.readFileSync(..." },
    { "lineNumber": 4, "kind": "added",   "content": "  const content = await fs.promises.readFile(..." },
    { "lineNumber": 5, "kind": "unchanged","content": "  return JSON.parse(content);" },
    { "lineNumber": 6, "kind": "unchanged","content": "}" }
  ]
}
```

---

## Integration Contract with Execution Layer

The `patch-engine` is a **passive transformer**. It does not initiate work. The execution
layer (or planner) must:

1. Detect which problems exist (using intelligence/analysis modules — NOT this module)
2. Decide which `PatchType(s)` to apply
3. Provide the source code as a plain string
4. Call `applyPatch()` or `applyBatchPatch()`
5. Consume the returned `PatchResult.patchedCode`

```
[Intelligence Layer]  →  detects pattern
[Planner Layer]       →  selects PatchType
[patch-engine]        →  transforms code string → returns PatchResult
[Execution Layer]     →  writes patchedCode to disk / applies change
```

The patch-engine is deliberately blind to filesystem, git, runtime, and planner — it
operates exclusively on strings in memory.

---

## Why Detection Is NOT Inside patch-engine

Detection (identifying whether a problem exists) and transformation (fixing it) are
separate responsibilities with separate reasons to change:

| Concern | Where it lives |
|---|---|
| "Does this code have a sync FS call?" (detection) | `performance-intelligence/` or caller |
| "Replace sync FS with async" (transformation) | `patch-engine/sync-reducer.patch.ts` |

Mixing them would violate SRP and force the patch module to change when detection rules
change — breaking HVP. The patch modules perform **pattern-confirming checks** only to
decide whether a transformation is applicable (SKIPPED vs SUCCESS), never to diagnose root causes.
