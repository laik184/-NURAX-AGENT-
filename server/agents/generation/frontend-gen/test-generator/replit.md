# Frontend Test Generator

## 1) Module purpose
Generate frontend unit/integration tests automatically for React, Next.js, and Vue targets while following strict HVP layering.

## 2) File responsibilities
- `types.ts` (L0): shared contracts (`TestCase`, `TestSuite`, `TestResult`, `CoverageReport`, `ComponentMeta`).
- `state.ts` (L0): immutable state store; only orchestrator actor can mutate.
- `orchestrator.ts` (L1): receives input, detects test type, invokes one agent, builds test file, computes coverage, writes output.
- `agents/*.agent.ts` (L2): one-job agents for component, page, form, api, interaction, and coverage analysis.
- `utils/*.util.ts` (L3): helper-only utilities for metadata parsing, assertions/imports, selectors, templates, and file output.
- `index.ts`: exports `generateComponentTest`, `generatePageTest`, `generateFormTest`.

## 3) Flow diagram
`input -> orchestrator -> detect type -> specific agent -> coverage-analyzer -> template util -> file-writer -> frozen output`

## 4) Import relationships
- Allowed: `orchestrator -> agents`
- Allowed: `agents -> utils`
- Allowed: `orchestrator -> utils`
- Forbidden by design: `agent -> agent`

## 5) Example test output
```json
{
  "success": true,
  "testFilePath": "/workspace/BACKEND-X-AGENT/generated-tests/Button.component.spec.tsx",
  "coverage": 67,
  "logs": [
    "received target: src/components/Button.tsx",
    "detected test type: component",
    "built 2 test cases",
    "estimated coverage: 67%",
    "wrote test file: ..."
  ]
}
```
