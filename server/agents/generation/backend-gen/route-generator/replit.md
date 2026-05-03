# Route Generator Module

## 1) Module purpose
The route generator creates REST route code from endpoint schemas for two frameworks: Express and NestJS.

## 2) File responsibilities
- `orchestrator.ts` (L1): Coordinates all generation steps and state transitions only.
- `agents/route-builder.agent.ts` (L2): Builds normalized route structures.
- `agents/http-method-mapper.agent.ts` (L2): Maps and validates incoming HTTP methods.
- `agents/framework-adapter.agent.ts` (L2): Converts normalized routes into framework-specific code.
- `agents/route-validator.agent.ts` (L2): Ensures route uniqueness and naming/path safety.
- `agents/route-writer.agent.ts` (L2): Produces output artifacts and uses a writer port abstraction.
- `utils/route-template.util.ts` (L3): Framework route statement templates.
- `utils/naming.util.ts` (L3): Route name generation helpers.
- `utils/path-builder.util.ts` (L3): Path normalization helper.
- `utils/formatter.util.ts` (L3): Final source formatting helpers.
- `types.ts` (L0): Public contracts and route result types.
- `state.ts` (L0): Immutable state creation and transition helpers.
- `index.ts`: Public module exports.

## 3) Flow (step-by-step)
1. `orchestrator.generateRoutes` receives schema input.
2. Calls `http-method-mapper` for each endpoint method.
3. Calls `route-builder` to create normalized route objects.
4. Calls `framework-adapter` to generate Express/NestJS code.
5. Calls `route-validator` for uniqueness/conflict checks.
6. Calls `route-writer` to produce final output content via abstraction.
7. Returns frozen output with files, routes, logs, and optional error.

## 4) Import relationships
- L1 (`orchestrator`) imports only L2 agents and L0 state/types.
- L2 agents import only L3 utils and L0 types.
- L3 utils import only L0 types where needed.
- No lateral agent-to-agent imports.

Import diagram:
`orchestrator -> agents -> utils`
`orchestrator -> state/types`
`agents -> types`

## 5) Example route generation
Input endpoint:
- `{ method: "GET", path: "/users", controller: "controller", action: "getUsers" }`

Express output:
- `router.get('/users', controller.getUsers);`

NestJS output:
- `@Get('users')`
- `getUsers() {}`
