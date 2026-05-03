# component-generator/utils

## Purpose
Leaf utilities for naming, path building, formatting, templates, and logs.

## Who calls whom
- Callers: agents and orchestrator.
- Callees: none (utility leaf layer).

## Import diagram

agents/*.ts, orchestrator.ts
  └─> utils/*.util.ts
