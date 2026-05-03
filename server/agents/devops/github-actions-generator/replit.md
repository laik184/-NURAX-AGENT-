# GitHub Actions Generator

HVP-compliant CI/CD workflow generator. Produces valid `.github/workflows/*.yml` YAML files for any supported language stack.

---

## Architecture Layers

```
L0  →  types.ts, state.ts          (contracts — no upward imports)
L1  →  orchestrator.ts             (pipeline sequencing — no logic)
L2  →  agents/                     (one job each — import L0 + L3 only)
L3  →  utils/                      (pure helpers — no agent imports)
```

**Import direction:** L1 → L2 → L3 → L0. No agent-to-agent imports. No execution side effects — pure YAML generation.

---

## CI/CD Workflow Generation Flow

```
caller
  └─ orchestrator.generateWorkflow(config)
       │
       ├─ 1. env-validator         → check required env vars have defaults or secrets declared
       │
       ├─ 2. trigger-config        → push + pull_request on main/develop + workflow_dispatch (if CD)
       │
       ├─ 3. deploy-strategy       → resolve staging / production / both deployment steps
       │
       ├─ 4. step-generator        → checkout → cache → setup → install → lint → test → build → deploy
       │       step-mapper.util → template.util
       │
       ├─ 5. job-planner           → ci job + optional staging/production deploy jobs + notify job
       │       job-mapper.util
       │
       └─ 6. workflow-builder      → assemble triggers + jobs → buildYaml()
               yaml-builder.util
```

---

## File Responsibilities

| File | Layer | Responsibility |
|---|---|---|
| `types.ts` | L0 | All interfaces: `WorkflowConfig`, `JobConfig`, `StepConfig`, `TriggerConfig`, `WorkflowResult`, `EnvVar`, state types |
| `state.ts` | L0 | Frozen `INITIAL_STATE` + pure `transitionState` |
| `orchestrator.ts` | L1 | Input validation, pipeline sequencing, final report assembly |
| `agents/env-validator.agent.ts` | L2 | Validate required env vars have defaults or are declared as secrets |
| `agents/trigger-config.agent.ts` | L2 | Define push / pull_request / workflow_dispatch triggers |
| `agents/deploy-strategy.agent.ts` | L2 | Resolve staging / production deploy step arrays |
| `agents/step-generator.agent.ts` | L2 | Generate all CI steps (checkout, cache, setup, install, lint, test, build) |
| `agents/job-planner.agent.ts` | L2 | Assemble CI, deploy, and notify jobs |
| `agents/workflow-builder.agent.ts` | L2 | Combine triggers + jobs into a valid YAML string |
| `utils/yaml-builder.util.ts` | L3 | YAML serialization: `serializeTriggers`, `serializeJob`, `serializeStep`, `buildYaml` |
| `utils/template.util.ts` | L3 | Per-language defaults (setup action, install/test/build/lint commands, cache paths) |
| `utils/step-mapper.util.ts` | L3 | `buildSetupStep`, `buildInstallStep`, `buildTestStep`, `buildBuildStep`, `buildDeployStep`, `buildCiSteps` |
| `utils/job-mapper.util.ts` | L3 | `buildCiJob`, `buildDeployStagingJob`, `buildDeployProductionJob`, `buildNotifyJob` |
| `utils/logger.util.ts` | L3 | Timestamped log and error string builders |
| `index.ts` | — | Public API: `generateWorkflow`, `validateWorkflow`, `previewWorkflow` |

---

## Trigger → Job → Step Flow

```
TriggerConfig (push/PR/manual)
  └─ JobConfig: ci
       └─ StepConfig: checkout → cache → setup-node → npm ci → lint → test → build
  └─ JobConfig: deploy-staging   (needs: [ci], if: branch == develop)
       └─ StepConfig: checkout → deploy-to-staging
  └─ JobConfig: deploy-production (needs: [ci], if: branch == main)
       └─ StepConfig: checkout → deploy-to-production
  └─ JobConfig: notify            (needs: all, if: failure())
       └─ StepConfig: echo failure message
```

---

## Example Generated YAML

**Input config (Node.js, staging + production CD):**

```ts
generateWorkflow({
  name: "Node CI/CD",
  language: "node",
  nodeVersion: "20",
  packageManager: "pnpm",
  triggers: { events: ["push", "pull_request"], branches: ["main", "develop"] },
  deployTarget: "both",
  envVars: [{ name: "DEPLOY_TOKEN", required: true, secret: true }],
})
```

**Output YAML (abbreviated):**

```yaml
name: Node CI/CD

on:
  push:
    branches:
      - main
      - master
      - develop
  pull_request:
    branches:
      - main
      - master
      - develop
  workflow_dispatch:

jobs:
  ci:
    name: CI — Install, Lint, Test, Build
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: ~/.pnpm-store
          key: ${{ runner.os }}-pnpm-cache-${{ hashFiles('**/lockfiles') }}
      - name: Setup node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Lint
        run: npm run lint
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build

  deploy-staging:
    name: Deploy — Staging
    runs-on: ubuntu-latest
    needs: [ci]
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Deploy to staging
        run: echo "Deploy to staging"
        env:
          DEPLOY_ENV: STAGING
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}

  deploy-production:
    name: Deploy — Production
    runs-on: ubuntu-latest
    needs: [ci]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Deploy to production
        run: echo "Deploy to production"
        env:
          DEPLOY_ENV: PRODUCTION
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}

  notify:
    name: Notify on failure
    runs-on: ubuntu-latest
    needs: [ci, deploy-staging, deploy-production]
    if: failure()
    steps:
      - name: Notify team
        run: echo "Workflow failed on ${{ github.ref }} — ${{ github.actor }}"
```

---

## Supported Languages

| Language | Setup Action | Default Version |
|---|---|---|
| `node` | `actions/setup-node@v4` | 20 |
| `python` | `actions/setup-python@v5` | 3.11 |
| `go` | `actions/setup-go@v5` | 1.22 |
| `java` | `actions/setup-java@v4` | 21 |
| `rust` | `dtolnay/rust-toolchain@stable` | stable |
| `generic` | — | — |

---

## HVP Compliance Checklist

- [x] Only downward imports (L1 → L2 → L3 → L0)
- [x] No agent-to-agent imports
- [x] One responsibility per agent
- [x] All outputs `Object.freeze`d
- [x] Pure generation — no execution, no DB, no infra side effects
- [x] Orchestrator contains zero business logic
