# Middleware Generator (HVP Compliant)

## 1) Middleware types

This generator supports:
- `auth`
- `logging`
- `validation`
- `error`
- `rate-limit`

Each type works with both `express` and `nest` frameworks.

## 2) Generation flow

1. `orchestrator.ts` receives `MiddlewareConfig`.
2. Orchestrator updates immutable state to `GENERATING`.
3. Orchestrator calls `middleware-generator.agent.ts` dispatcher.
4. Dispatcher selects the right single-responsibility agent.
5. Agent loads a static template, builds imports, composes final code.
6. Orchestrator stores result/logs/errors and returns frozen output.

Flow example:
`orchestrator -> auth-agent -> template-loader -> code-builder`

## 3) File responsibilities

- `types.ts`: Contracts for config/result/framework.
- `state.ts`: Immutable generation state and status model.
- `orchestrator.ts`: State lifecycle + delegation to dispatcher agent.
- `agents/*.agent.ts`: One middleware type per file.
- `utils/*.util.ts`: Reusable helper utilities only.
- `templates/**/*`: Static framework-specific middleware templates.
- `index.ts`: Public API exports.

## 4) Import relationships

HVP layer map:
- L0: `types.ts`, `state.ts`
- L1: `orchestrator.ts`
- L2: `agents/`
- L3: `utils/`

Allowed imports:
- `orchestrator -> agents`
- `orchestrator -> state/types`
- `agents -> utils/types`
- `utils -> templates/types`

Forbidden:
- `agent -> agent`
- upward imports from lower layers
- direct file writes in agents

## 5) Example middleware output

```ts
{
  success: true,
  name: "express-auth-middleware",
  code: "import type { Request, Response, NextFunction } from 'express';\\n...",
  framework: "express",
  logs: [
    "Auth middleware generation started for framework=express",
    "Template loaded successfully",
    "Auth middleware generation completed"
  ]
}
```

Every output object is wrapped with `Object.freeze(...)`.
