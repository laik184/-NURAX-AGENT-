# DevOps Git Agent (HVP)

## 1) Module Overview
This module provides a production-oriented Git operation layer with strict HVP layering:
- **L0**: contracts and state (`types.ts`, `state.ts`)
- **L1**: action routing (`orchestrator.ts`)
- **L2**: single-responsibility Git agents (`agents/*.agent.ts`)
- **L3**: utilities for execution, parsing, error handling, message construction, and logging (`utils/*.util.ts`)

## 2) File Responsibilities
- `types.ts`: action, option, output, and log entry type contracts.
- `state.ts`: internal Git runtime state with controlled mutation helpers.
- `orchestrator.ts`: receives actions, routes to an agent, normalizes response, and updates state.
- `index.ts`: public exports.
- `agents/commit.agent.ts`: stage and commit changes.
- `agents/branch.agent.ts`: create/delete/list branches.
- `agents/checkout.agent.ts`: switch branches.
- `agents/merge.agent.ts`: merge branches and surface conflicts.
- `agents/status.agent.ts`: read repo status.
- `agents/log.agent.ts`: read commit history.
- `utils/git-command.util.ts`: execute git CLI command.
- `utils/output-parser.util.ts`: parse branch/status/log outputs.
- `utils/error-normalizer.util.ts`: normalize thrown git errors.
- `utils/message-builder.util.ts`: build commit messages.
- `utils/logger.util.ts`: produce scoped operation logs.

## 3) Import Flow
Only downward dependencies are used:
- `orchestrator.ts` → `agents/*` and `state.ts` and `utils/*`
- `agents/*` → `utils/*` and `types.ts`
- `utils/*` → `types.ts` when required
- No `agent -> agent` imports

## 4) Execution Flow
1. Client calls `runGitAction(action, payload)`.
2. Orchestrator sets state status to `RUNNING`.
3. Orchestrator routes action to one agent.
4. Agent uses `git-command.util.ts` for git command execution.
5. Agent returns `GitResult`.
6. Orchestrator updates state, normalizes output, and returns frozen response.

## 5) Example Usage
`orchestrator -> commit.agent -> git-command.util`

```ts
import { commitChanges, runGitAction } from './index.js';

await commitChanges({ message: 'feat: add git automation' });
await runGitAction('branch', { operation: 'create', name: 'feature/hvp-git' });
```
