# Agents Folder

## Purpose
Contains generator agents. Each file performs one responsibility and is invoked by `../orchestrator.ts`.

## Call graph
`orchestrator.ts` -> (`store-generator.agent.ts`, `slice-generator.agent.ts`, `action-generator.agent.ts`, `selector-generator.agent.ts`, `middleware-generator.agent.ts`, `provider-generator.agent.ts`)

## Import policy
- Agents may import only `../types.ts` and `../utils/*`.
- Agents must not import other agents.
