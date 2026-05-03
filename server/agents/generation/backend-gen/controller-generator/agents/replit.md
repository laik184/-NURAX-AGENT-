# controller-generator/agents

Each agent has a single responsibility and is called only by `../orchestrator.ts`.

- `route-mapper.agent.ts` → route normalization
- `request-parser.agent.ts` → request extraction planning
- `validation-injector.agent.ts` → validation binding
- `response-builder.agent.ts` → response payload/status code
- `error-handler.agent.ts` → try/catch wrapper
- `controller-builder.agent.ts` → final source assembly

Import rule: agents may import only `../types.ts` and `../utils/*`.
