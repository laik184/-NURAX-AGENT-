# Service Generator Module

## 1) Module overview
This module generates production-ready backend service layer code from a structured `ServiceConfig`. It enforces clean architecture by isolating orchestration, single-responsibility agents, and helper utilities.

## 2) File responsibilities
- `types.ts`: shared contracts (`ServiceConfig`, `ServiceMethod`, `GeneratedService`, `DependencyConfig`, output/state models).
- `state.ts`: immutable state lifecycle and log/error recording helpers.
- `orchestrator.ts`: generation pipeline coordination only (no business logic).
- `index.ts`: public exports (`generateService`).
- `agents/service-planner.agent.ts`: plans CRUD and custom method definitions.
- `agents/method-generator.agent.ts`: converts method plans into method code models.
- `agents/validation-injector.agent.ts`: prepends validation logic by validation mode.
- `agents/error-handler.agent.ts`: wraps methods with consistent try/catch error behavior.
- `agents/dependency-injector.agent.ts`: resolves/injects repository and service dependencies.
- `agents/code-writer.agent.ts`: composes final service code text.
- `utils/prompt-builder.util.ts`: prompt summary helper for generation context.
- `utils/template-loader.util.ts`: framework-oriented header templates.
- `utils/naming.util.ts`: consistent class/file/property naming.
- `utils/formatter.util.ts`: code formatting helper.
- `utils/logger.util.ts`: standard log entry helper.

## 3) Flow diagram
`orchestrator -> planner -> method-generator -> validation-injector -> dependency-injector -> error-handler -> code-writer`

## 4) Import relationships
- L1 (`orchestrator`) imports L2 agents and L0 (`types`, `state`).
- L2 (`agents`) import only L0 and L3 (`utils`).
- L3 (`utils`) import only L0 where needed.
- L0 (`types`, `state`) import no agents.

## 5) Example service generation
Input:
- `entityName: "User"`
- `framework: "express"`
- `includeCrud: true`
- `validation: "zod"`

Output:
- `{ success: true, code: "...", fileName: "user.service.ts", logs: [...] }`
- Output object is immutable via `Object.freeze(output)`.
