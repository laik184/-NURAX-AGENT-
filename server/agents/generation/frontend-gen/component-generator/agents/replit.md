# component-generator/agents

## Purpose
Single-responsibility generation agents called only by `../orchestrator.ts`.

## Who calls whom
- Caller: `../orchestrator.ts`
- Callees: each agent may call `../utils/*` and consume `../types.ts`.
- No agent calls another agent.

## Import diagram

orchestrator.ts
  ├─> component-planner.agent.ts
  ├─> props-builder.agent.ts
  ├─> template-selector.agent.ts
  ├─> jsx-generator.agent.ts
  ├─> style-generator.agent.ts
  ├─> test-generator.agent.ts
  └─> export-builder.agent.ts
