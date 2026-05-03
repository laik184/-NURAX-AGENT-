# code-gen module

## 1) Module overview
`code-gen` is a layered code generation agent that turns a user intent into a validated file map.

## 2) Flow (step-by-step)
1. `orchestrator.ts` receives a `CodeRequest`.
2. `structure-planner.agent.ts` creates planned files.
3. `template-selector.agent.ts` picks the generation template.
4. `prompt-builder.agent.ts` builds an LLM-safe prompt.
5. `code-writer.agent.ts` calls LLM and emits generated files.
6. `output-validator.agent.ts` validates naming/completeness.
7. orchestrator returns frozen output.

Flow diagram:
`orchestrator -> planner -> template-selector -> prompt-builder -> code-writer -> output-validator`

## 3) File responsibilities
- `types.ts`: contracts for request, files, result, validation.
- `state.ts`: immutable state model + controlled transitions.
- `orchestrator.ts`: sequencing only (no business logic).
- `index.ts`: public API (`generateCode`, `validateCode`, `buildStructure`).
- `agents/*`: single-job generation agents.
- `utils/*`: low-level shared helpers.

## 4) Import relationships
- L1: `orchestrator.ts` imports L2/L0 only.
- L2: `agents/*` import L3/L0 only.
- L3: `utils/*` import L0 when needed.
- Forbidden: agent-to-agent imports.

## 5) Example generation
Input intent: `"create auth API"`
Result: frozen object
- `success: true`
- `files: [{ path, content }, ...]`
- `logs: [...]`
