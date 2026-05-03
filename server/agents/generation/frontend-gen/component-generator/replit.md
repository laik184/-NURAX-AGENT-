# component-generator

## 1) Module overview

`component-generator` is an HVP-compliant frontend generation module that creates reusable UI component artifacts for React (primary) and Vue (secondary). It coordinates planning, props design, template selection, render code generation, styling, tests, and export assembly without any direct file-system writes.

## 2) File responsibilities

- `orchestrator.ts` (L1): Coordinates the full generation flow and optional delegation to `file-writer.agent`.
- `types.ts` (L0): Shared contracts for request, plan, props, files, result, state shape.
- `state.ts` (L0): Immutable state transitions used only by the orchestrator.
- `index.ts`: Public API export (`generateComponent`).

### Agents (L2)
- `agents/component-planner.agent.ts`: Resolves framework, component variant, and file/folder plan.
- `agents/props-builder.agent.ts`: Produces typed props definition/signature.
- `agents/template-selector.agent.ts`: Selects UI template by framework + variant.
- `agents/jsx-generator.agent.ts`: Builds main component file (`.tsx` / `.vue`).
- `agents/style-generator.agent.ts`: Produces optional CSS artifact.
- `agents/test-generator.agent.ts`: Produces unit test scaffold (Vitest/Jest style contract).
- `agents/export-builder.agent.ts`: Produces barrel export file.

### Utils (L3)
- `utils/naming.util.ts`: Consistent naming transformation utilities.
- `utils/file-structure.util.ts`: Path shaping helpers from plan metadata.
- `utils/template-loader.util.ts`: Central template registry/loader.
- `utils/formatter.util.ts`: Lightweight output formatter.
- `utils/logger.util.ts`: Scoped log message utility.

## 3) Flow (step-by-step)

1. `orchestrator.generateComponent(request)` receives component request.
2. Calls planner agent to define framework + file layout.
3. Calls props-builder agent for prop type model.
4. Calls template-selector agent to fetch the correct template.
5. Calls jsx-generator agent for component render file.
6. Calls style-generator agent for style asset (if CSS strategy).
7. Calls test-generator agent for test artifact.
8. Calls export-builder agent for index exports.
9. Delegates generated files to external `file-writer.agent` if provided.
10. Returns frozen `ComponentResult` output.

## 4) Import relationships

Allowed (enforced):
- L1 (`orchestrator.ts`) → L2 agents, L0 state/types, L3 logger util.
- L2 agents → L3 utils + L0 types.
- L3 utils → local pure utility logic only.
- `index.ts` → orchestrator/types.

Forbidden:
- agent → agent imports.
- upward imports from lower layers.
- direct file writing from agents.

## 5) Example component generation

Request:

```ts
await generateComponent({
  componentName: "UserCard",
  framework: "react",
  variant: "card",
  styleStrategy: "tailwind",
  props: [
    { name: "title", type: "string", required: true },
    { name: "subtitle", type: "string" }
  ]
}, fileWriterAgent);
```

Pipeline:

`orchestrator → planner → props → template → jsx → style → test → export → file-writer.agent`

Output includes immutable result metadata:
- `success`
- `componentName`
- `files[]`
- `logs[]`
- optional `error`
