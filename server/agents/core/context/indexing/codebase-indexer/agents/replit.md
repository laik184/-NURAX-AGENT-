# Agents Folder - Codebase Indexer

## Purpose
Contains domain agents used by `../orchestrator.ts` in sequence.

## Files
- `file-scanner.agent.ts`: repository traversal + file metadata hashing.
- `ast-parser.agent.ts`: JS/TS parsing into TypeScript AST.
- `symbol-extractor.agent.ts`: symbol extraction for functions/classes/interfaces/types/enums/methods.
- `dependency-mapper.agent.ts`: import/export graph extraction.
- `embedding-generator.agent.ts`: chunked deterministic vector generation.
- `index-builder.agent.ts`: final searchable index assembly.

## Call Graph
`orchestrator.ts` → each agent (no agent-to-agent calls).
