# Context Builder (HVP-Compliant)

## 1) Context Selection Flow

`query → relevance-scorer → context-selector → dependency-expander → context-pruner → ranking-engine`

The orchestrator is the only coordinator and runs the flow in strict order.

## 2) File Responsibilities

### L0 (Foundational)
- `types.ts`: shared contracts (`ContextChunk`, `ContextScore`, `RankedContext`, `ContextResult`, input/state types)
- `state.ts`: immutable lifecycle state model and transition utility used by orchestrator

### L1 (Orchestrator)
- `orchestrator.ts`: executes pipeline, transitions state, and emits frozen output

### L2 (Agents)
- `agents/relevance-scorer.agent.ts`: computes query-vs-file relevance score
- `agents/context-selector.agent.ts`: selects highest scored files
- `agents/dependency-expander.agent.ts`: includes directly imported related files
- `agents/context-pruner.agent.ts`: removes chunks that exceed token budget
- `agents/ranking-engine.agent.ts`: generates final ranked context ordering

### L3 (Utils)
- `utils/token-estimator.util.ts`: text → estimated token count
- `utils/text-chunker.util.ts`: file text → line-based `ContextChunk[]`
- `utils/similarity.util.ts`: token overlap similarity helper
- `utils/path-resolver.util.ts`: import path normalization and resolving
- `utils/logger.util.ts`: timestamped log message helper

## 3) Import Relationships

Allowed directions:
- `orchestrator.ts` → `agents/*`, `state.ts`, `utils/*`, `types.ts`
- `agents/*` → `utils/*`, `types.ts`
- `utils/*` → local utility-only dependencies

Forbidden:
- agent → agent imports
- util → agent imports
- upward dependencies from lower layers

## 4) Scoring Logic

1. `relevance-scorer` computes weighted score:
   - content token overlap score
   - plus light path token overlap bonus
2. `selector` keeps top N files by score
3. `dependency-expander` adds directly imported files if present
4. `pruner` enforces max token limit
5. `ranking-engine` combines file relevance and chunk compactness

## 5) Example Query

- Query: `"optimize token usage in context builder"`
- Result behavior:
  1. Files mentioning token estimation/chunking are scored higher.
  2. Top files are selected.
  3. Referenced imports are included.
  4. Oversized context is pruned to max tokens.
  5. Remaining chunks are returned as ranked frozen output.
