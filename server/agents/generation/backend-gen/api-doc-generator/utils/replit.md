# Utils Folder

## Purpose
Contains L3 utilities for parsing, normalization, type mapping, JSON freezing, and logging.

## Caller map
- `orchestrator.ts` calls parser/logger/json/schema utilities.
- agents call parser/type mapper utilities as needed.

## Import diagram
`orchestrator/agents -> utils`

Utilities contain no orchestration or business flow logic.
