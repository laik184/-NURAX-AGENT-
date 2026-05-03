# routing-generator module

## 1) Routing flow
1. `orchestrator.ts` starts generation and transitions immutable state.
2. `route-analyzer.agent.ts` scans project structure (`pages/`, `controllers/`, `app/`, `routes/`).
3. `route-mapper.agent.ts` maps files to normalized route paths.
4. Orchestrator detects framework type from hints and route kinds.
5. `backend-router.agent.ts` and `frontend-router.agent.ts` generate framework-aware routing files.
6. `dynamic-route.agent.ts` extracts dynamic params (`:id`, `[slug]`, `[...all]`).
7. `validation.agent.ts` validates duplicates and path correctness.
8. `file-writer.util.ts` writes files without overwrite unless explicitly enabled.

Flow diagram:
`orchestrator -> route-analyzer -> route-mapper -> backend/frontend-router -> validation -> writer`

## 2) File responsibilities
- `types.ts`: route contracts, framework types, validation/result contracts.
- `state.ts`: immutable runtime state and transitions.
- `orchestrator.ts`: sequence coordination only, no route-domain implementation logic.
- `index.ts`: public API (`generateRoutes`, `validateRoutes`).
- `agents/*`: single-responsibility route analysis/generation/validation workers.
- `utils/*`: helpers for parsing paths, naming, templates, file writes, and logs.

## 3) Import relationships
- L1: `orchestrator.ts` imports L2/L3/L0 only.
- L2: `agents/*` import `utils/*` and `types.ts`.
- L3: `utils/*` import standard libs and `types.ts` only.
- L0: `types.ts`, `state.ts` have no agent dependencies.
- Forbidden: `agent -> agent` imports.

## 4) Backend vs frontend routing
- Backend route generation supports: `express`, `fastify`, `nestjs`.
- Frontend route generation supports: `react-router`, `nextjs`, `vue-router`.
- Mixed repositories are supported; backend and frontend outputs are generated independently when source files exist.

## 5) Example routes
- `controllers/users/[id].controller.ts` -> `/users/:id`
- `pages/dashboard/index.tsx` -> `/dashboard`
- `app/blog/[slug].tsx` -> `/blog/:slug`
