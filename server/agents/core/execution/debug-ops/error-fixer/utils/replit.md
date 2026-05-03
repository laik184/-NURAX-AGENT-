# Utils Layer

## Purpose
Helper-only utilities for parsing/classification/log formatting/diff generation and safe file reads.

## Callers
- Called by `../orchestrator.ts` and files in `../agents/`.

## Import Diagram
```text
agents/*.ts, orchestrator.ts
  -> stacktrace-parser.util.ts
  -> error-classifier.util.ts
  -> diff-builder.util.ts
  -> file-locator.util.ts
  -> logger.util.ts
```
