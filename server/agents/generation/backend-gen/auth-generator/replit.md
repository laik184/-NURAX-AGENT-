# Auth Generator (HVP)

## 1) Auth flow (JWT / OAuth / Session)

- `orchestrator.ts` receives `AuthConfig`.
- It validates input, chooses strategy with `strategy-selector.agent.ts`, and calls exactly one strategy generator:
  - `jwt-generator.agent.ts`
  - `oauth-generator.agent.ts`
  - `session-generator.agent.ts`
- It then always appends:
  - `auth-controller.agent.ts`
  - `auth-service.agent.ts`
  - `rbac-generator.agent.ts`
  - `middleware-generator.agent.ts`
- Output is returned in frozen format: `{ success, files, strategy, logs, error? }`.

## 2) File responsibilities

- `types.ts`: domain contracts (AuthConfig, AuthStrategy, TokenPayload, Role, Permission, AuthModuleOutput).
- `state.ts`: immutable generator state and logged transitions.
- `orchestrator.ts`: sequencing only (no business auth logic).
- `agents/*`: one-file, one-job generators.
- `utils/*`: shared helpers for token/hash/validation/config/template building.
- `index.ts`: public API exports (`generateAuthModule`, `validateAuth`, `getAuthStrategy`).

## 3) Import relationships

- L1 (`orchestrator`) -> L2 (`agents`) + L3 (`utils`) + L0 (`types/state`)
- L2 (`agents`) -> L3 (`utils`) + L0 (`types`)
- L3 (`utils`) -> L0 (`types`, when needed)
- L0 has no upward imports.
- No `agent -> agent` imports.

## 4) Middleware flow

1. `authenticate` verifies active strategy credentials.
2. Request identity context is attached.
3. `authorize(requiredRole)` enforces role guard and returns `403` on mismatch.

## 5) Example usage

```ts
import { generateAuthModule } from './index.js';

const output = generateAuthModule({
  strategy: 'JWT',
  issuer: 'nura-x',
  audience: 'nura-x-api',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  roles: ['admin', 'user'],
  permissions: ['auth:login', 'auth:register', 'auth:logout'],
});
```

Pipeline example:

`orchestrator -> strategy-selector -> jwt-generator -> controller/service -> rbac -> middleware`
