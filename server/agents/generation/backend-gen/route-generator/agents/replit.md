# Agents Layer

## Purpose
Contains single-responsibility route generation agents.

## Files
- `route-builder.agent.ts`: Builds canonical route models.
- `http-method-mapper.agent.ts`: Maps method strings to supported HTTP methods.
- `framework-adapter.agent.ts`: Converts canonical routes to Express/NestJS syntax.
- `route-validator.agent.ts`: Validates uniqueness and naming conflicts.
- `route-writer.agent.ts`: Prepares output files and delegates persistence to a writer abstraction.

## Callers
Called only by `../orchestrator.ts`.

## Import diagram
`orchestrator -> agents`
`agents -> ../types`
`agents -> ../utils`
