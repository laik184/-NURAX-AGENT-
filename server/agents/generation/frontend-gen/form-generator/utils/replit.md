# form-generator/utils

## Purpose
L3 utility helpers for mapping and templates only (no orchestration/business flow).

## Files and Callers
- `schema-mapper.util.ts` (called by `../orchestrator.ts`)
- `field-mapper.util.ts` (called by `../agents/form-structure.agent.ts`)
- `validation-mapper.util.ts` (called by `../agents/validation-builder.agent.ts`)
- `component-template.util.ts` (called by `../orchestrator.ts`)
- `formatter.util.ts` (called by `../orchestrator.ts`)

## Import Diagram
agents/orchestrator -> utils
utils -> `../types.ts` only when typing is needed

No utility imports L1/L2 modules.
