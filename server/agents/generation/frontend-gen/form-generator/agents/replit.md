# form-generator/agents

## Purpose
Cohesive L2 agents that each perform exactly one generation responsibility.

## Files and Callers
- `form-structure.agent.ts` (called by `../orchestrator.ts`)
- `input-field.agent.ts` (called by `../orchestrator.ts`)
- `validation-builder.agent.ts` (called by `../orchestrator.ts` and re-exported by `../index.ts`)
- `submit-handler.agent.ts` (called by `../orchestrator.ts`)
- `api-integration.agent.ts` (called by `../orchestrator.ts`)
- `error-handler.agent.ts` (called by `../orchestrator.ts`)

## Import Diagram
`orchestrator.ts` -> each agent

Agents -> `../types.ts` and/or `../utils/*`

No agent imports another agent.
