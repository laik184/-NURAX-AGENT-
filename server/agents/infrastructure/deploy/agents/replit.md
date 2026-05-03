# deploy/agents

- `deployment-agent.agent.ts`: main deploy flow orchestration (build -> deploy -> verify -> rollback on failure).
- `build-trigger.agent.ts`: build process trigger through execution public API.
- `deploy-runner.agent.ts`: deployment execution through infra+execution public APIs.
- `verification.agent.ts`: deployment health verification.
- `rollback-trigger.agent.ts`: rollback planning trigger.
- `environment-resolver.agent.ts`: environment resolution.

No agent imports another agent directly.
