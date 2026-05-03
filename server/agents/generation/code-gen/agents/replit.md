# code-gen/agents

## Purpose
Contains L2 agents with exactly one responsibility each.

## Call graph
Only `../orchestrator.ts` calls these agents.

- `structure-planner.agent.ts` -> plans files.
- `template-selector.agent.ts` -> selects framework template.
- `prompt-builder.agent.ts` -> composes LLM prompt.
- `code-writer.agent.ts` -> executes LLM generation and fallback.
- `output-validator.agent.ts` -> validates completeness and structure.

## Import diagram
`orchestrator -> agents`
`agents -> ../utils or ../types`
No `agent -> agent` imports.
