# code-gen/utils

## Purpose
L3 shared helpers used by agents and orchestrator.

## Files
- `llm-client.util.ts`: LLM HTTP client abstraction.
- `code-formatter.util.ts`: formatting guardrails for generated content.
- `naming.util.ts`: path normalization and naming validation.
- `file-map.util.ts`: dedupe and immutable file map helpers.
- `logger.util.ts`: scoped logging utility.

## Import relationships
Called by `../agents/*` and `../orchestrator.ts`.
Utilities do not import agents.
