# Agents Folder

## Purpose
Contains L2 single-responsibility agents used only by `orchestrator.ts`.

## Caller map
- `orchestrator.ts` -> `route-extractor.agent.ts`
- `orchestrator.ts` -> `schema-extractor.agent.ts`
- `orchestrator.ts` -> `request-builder.agent.ts`
- `orchestrator.ts` -> `response-builder.agent.ts`
- `orchestrator.ts` -> `example-generator.agent.ts`
- `orchestrator.ts` -> `openapi-builder.agent.ts`

## Import diagram
`orchestrator (L1) -> agents (L2) -> utils/types (L3/L0)`

No agent imports another agent.
