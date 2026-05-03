# Agents Folder

## Purpose
Contains isolated generation agents. Each file has exactly one responsibility:
- `controller-test.agent.ts`: controller endpoint tests
- `service-test.agent.ts`: service unit tests
- `route-test.agent.ts`: route contract tests
- `integration-test.agent.ts`: full request/response flow tests
- `mock-data-generator.agent.ts`: synthetic inputs and fixtures
- `assertion-builder.agent.ts`: expectation line generation

## Call graph
`orchestrator.ts` calls each agent directly.

## Import rules
- Allowed: agent -> utils, agent -> types
- Forbidden: agent -> agent
