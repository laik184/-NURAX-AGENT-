# Agents Folder

Single-responsibility generation agents used by `../orchestrator.ts`.

- `service-planner.agent.ts`: method planning.
- `method-generator.agent.ts`: method skeleton generation.
- `validation-injector.agent.ts`: validation line injection.
- `dependency-injector.agent.ts`: dependency model generation.
- `error-handler.agent.ts`: try/catch wrapping.
- `code-writer.agent.ts`: final code assembly.

Import diagram:
- `orchestrator.ts -> agents/*`
- `agents/* -> ../types.ts`
- `agents/* -> ../utils/*` (where needed)
- No agent imports another agent.
