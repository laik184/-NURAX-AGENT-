# routing-generator/agents

## Purpose
L2 workers with one responsibility per file.

## Responsibilities
- `route-analyzer.agent.ts`: scan folders and detect route candidate files/framework hints.
- `route-mapper.agent.ts`: map file paths to normalized route paths.
- `backend-router.agent.ts`: generate backend route output for Express/Fastify/NestJS.
- `frontend-router.agent.ts`: generate frontend route output for React Router/Next.js/Vue Router.
- `dynamic-route.agent.ts`: extract dynamic params from mapped paths.
- `validation.agent.ts`: validate duplicates, invalid paths, and dynamic integrity.

## Call/import diagram
`orchestrator -> agents`
`agents -> ../utils | ../types`
No `agent -> agent` imports.
