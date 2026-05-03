# LLM Context Compression Engine

## 1) Compression Pipeline

The engine uses a strict, deterministic pipeline:

`raw context -> relevance filter -> chunking -> priority ranking -> summarization -> deduplication -> merge`

The orchestrator coordinates all steps without embedding business logic from any single agent.

## 2) Agent Responsibilities

- **relevance-filter.agent.ts**: removes noisy text like debug logs and console traces.
- **chunker.agent.ts**: slices large context into manageable chunks with overlap.
- **priority-ranker.agent.ts**: scores chunks by signal words and content density.
- **summarizer.agent.ts**: compresses over-budget chunks while preserving meaning.
- **deduplicator.agent.ts**: removes near-duplicate chunks via similarity scoring.
- **context-merger.agent.ts**: assembles the final optimized context payload.

## 3) Import Flow (HVP)

- L1: `orchestrator.ts` imports L2 agents + L3 utils + L0 state/types.
- L2: agents import only L3 utils and L0 types.
- L3: utils are pure helper functions with no business orchestration.
- L0: `types.ts` and `state.ts` define canonical contracts + lifecycle state.

No agent-to-agent imports are used.

## 4) Example Input -> Output

### Input

A long mixed payload containing:
- stack traces,
- debug logs,
- duplicate snippets,
- core implementation notes.

### Output

A compressed context string that:
- excludes obvious noise,
- keeps high-priority implementation details,
- preserves semantic intent,
- fits configured token constraints.

## 5) Token Optimization Strategy

- Estimate tokens early for planning (`token-estimator.util.ts`).
- Apply relevance filtering before expensive operations.
- Rank and select chunks by value-to-size contribution.
- Summarize only when chunks exceed summary budget.
- Deduplicate near-identical segments before final merge.
- Re-estimate final token count and expose compression ratio metrics.
