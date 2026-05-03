# Agents Layer (L2)

## Purpose
Each agent has a single responsibility and returns test cases or coverage analysis data.

## Files
- `component-test.agent.ts`: component render + props test generation.
- `page-test.agent.ts`: full-page rendering + navigation test generation.
- `form-test.agent.ts`: form input/validation/submit tests.
- `api-test.agent.ts`: API mock and response behavior tests.
- `interaction-test.agent.ts`: click/typing user-flow tests.
- `coverage-analyzer.agent.ts`: coverage estimation and missing area detection.

## Call graph
`orchestrator.ts -> any single test agent`

`orchestrator.ts -> coverage-analyzer.agent.ts`

No agent imports another agent.
