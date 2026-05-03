# DevOps Deployment Agent (HVP)

## 1) Deployment Flow

`orchestrator -> deployment-agent -> build-trigger -> deploy-runner -> verification -> rollback-trigger`

Execution sequence:
1. Orchestrator receives `DeploymentConfig`.
2. Environment resolver loads normalized environment context.
3. Deployment agent runs build, deploy, and verify in order.
4. On deploy/verify failure, rollback trigger is called.
5. Orchestrator finalizes immutable output and state transition.

## 2) File Responsibilities

- `orchestrator.ts` (L1): state transitions + dependency wiring, no business-heavy execution internals.
- `agents/deployment-agent.agent.ts` (L2): main deployment flow coordination.
- `agents/build-trigger.agent.ts` (L2): build invocation.
- `agents/deploy-runner.agent.ts` (L2): deployment invocation through public infra/execution interfaces.
- `agents/verification.agent.ts` (L2): health verification.
- `agents/rollback-trigger.agent.ts` (L2): rollback plan trigger.
- `agents/environment-resolver.agent.ts` (L2): environment normalization.
- `utils/*` (L3): formatting, parsing, normalization, timing, command composition helpers.
- `types.ts` + `state.ts` (L0): canonical contracts and immutable state model.
- `index.ts`: public API exports (`deployApp`, `verifyDeployment`, `rollbackDeployment`).

## 3) Module Connections

- Build/deploy execution uses: `server/deployer/runtime/execution/index.ts`.
- Infra provisioning/network/container lifecycle uses: `server/deployer/infra/infrastructure/index.ts`.
- Rollback planning uses: `server/governance/rollback/index.ts`.
- Environment configuration uses: `server/config/index.ts`.

All integrations are through public `index.ts` entry points only.

## 4) Import Relationships

Layer policy enforced:
- L1 -> L2/L3/L0
- L2 -> L3/L0 + external public module indexes
- L3 -> no domain logic
- L0 -> standalone contracts/state

No direct agent-to-agent imports are used inside agent files.

## 5) Example Deployment

```ts
import { deployApp } from "./index.js";

const result = await deployApp({
  deploymentId: "dep-001",
  environment: "staging",
  workspacePath: "/workspace/BACKEND-X-AGENT",
  appId: "nura-api",
  serviceUrl: "http://localhost:3000/health",
  rollbackSnapshotFrom: "snap-current",
  rollbackSnapshotTo: "snap-last-known-good",
  requestedBy: "ci-pipeline",
});
```

Output contract (frozen):

```ts
{
  success: boolean,
  environment: string,
  logs: string[],
  error?: string
}
```
