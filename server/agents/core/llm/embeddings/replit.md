# Embeddings Engine (HVP)

## 1) Embeddings flow

The orchestrator is the only Level-1 coordinator and follows this path:

`orchestrator -> chunking -> embedding-generator -> indexing -> vector-store -> similarity-search -> ranking`

Detailed runtime flow:
1. Accept text/code input and optional search query.
2. Chunk content with token-aware splitting.
3. Generate vectors in batches through a provider abstraction.
4. Build chunk index mappings.
5. Upsert vectors with dedup-by-id behavior.
6. Optionally embed query and perform cosine similarity.
7. Rank and threshold results, then return immutable output.

## 2) Vector storage logic

- `vector-store.agent.ts` is storage abstraction for in-memory upsert/retrieve.
- Stored vectors are deduplicated by `id` in a `Map` merge.
- Output vectors are immutable (`Object.freeze`) for safe sharing.
- No direct DB client is used; persistent storage can be added behind this agent later.

## 3) File responsibilities

- `types.ts` (L0): contracts for vectors, chunks, queries, results, state, provider.
- `state.ts` (L0): default immutable state (`IDLE`).
- `orchestrator.ts` (L1): pipeline coordination only.
- `agents/*` (L2): one responsibility each:
  - `chunking`: token-aware segmentation
  - `embedding-generator`: provider call, batching, cache, normalization
  - `indexing`: chunk ID -> content map
  - `vector-store`: upsert/retrieve vectors
  - `similarity-search`: cosine top-k search
  - `ranking`: score sorting + threshold filter
- `utils/*` (L3): pure helpers only (tokenization, similarity, normalization, IDs, logging).
- `index.ts`: public module API exports.

## 4) Import relationships

Allowed dependencies:
- L1 `orchestrator.ts` -> L2 agents + L0 types/state + L3 utils
- L2 agents -> L3 utils + L0 types
- L3 utils -> no module side effects

Forbidden and respected:
- No agent-to-agent imports
- No upward imports
- No direct LLM SDK logic in agents (provider abstraction injected)
- No direct DB/vector DB logic in agents

## 5) Example: search query -> result

Input query:
```json
{ "text": "how to validate JWT token", "topK": 3, "threshold": 0.4 }
```

Flow:
1. Query embedding generated with provider abstraction.
2. Cosine scores computed against stored vectors.
3. Top-3 selected.
4. Ranking agent removes items under `0.4` and sorts descending.
5. API returns immutable result list in strict output format.
