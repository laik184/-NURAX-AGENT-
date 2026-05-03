# Frontend Page Generator (HVP)

## 1) Page generation flow

`orchestrator -> layout-builder -> component-composer -> data-binding -> api-integration -> state-integrator -> routing-integrator -> seo-meta`

The orchestrator receives `PageSpec`, executes each agent in strict order, updates immutable module state snapshots, and returns frozen `PageResult`.

## 2) File responsibilities

- `types.ts` (L0): shared contracts (`PageSpec`, `ComponentSpec`, `LayoutSpec`, `PageResult`).
- `state.ts` (L0): in-memory generator state with frozen snapshots.
- `orchestrator.ts` (L1): pure pipeline sequencing only.
- `agents/*` (L2): one job per agent (layout, components, binding, API, state, routing, SEO).
- `utils/*` (L3): formatting, naming, templates, file upsert, logs.
- `index.ts`: public API (`generatePage`, `validatePage`, `getPageStructure`).

## 3) Import relationships

- Allowed:
  - `orchestrator -> agents`
  - `agents -> utils`
  - `orchestrator/index -> types/state`
- Forbidden:
  - `agent -> agent`
  - `utils -> agents/orchestrator`

## 4) Example page generation

Input:
- `pageName: "orders"`
- `framework: "react"`
- `routePath: "/orders"`
- `components: [{ name: "orders-table", type: "list" }]`

Output:
- `pages/OrdersPage.tsx`
- `components/OrdersTable.tsx`
- `api/orders.api.ts`
- `state/orders.state.ts`
- `routing/orders.route.tsx`
- `seo/orders.seo.ts`

## 5) Supported frameworks

- React
- Next.js
- Vue

## Import diagram

```
index.ts
  ├─ orchestrator.ts
  │   ├─ agents/layout-builder.agent.ts
  │   ├─ agents/component-composer.agent.ts
  │   ├─ agents/data-binding.agent.ts
  │   ├─ agents/api-integration.agent.ts
  │   ├─ agents/state-integrator.agent.ts
  │   ├─ agents/routing-integrator.agent.ts
  │   └─ agents/seo-meta.agent.ts
  ├─ state.ts
  └─ types.ts

agents/*
  └─ utils/*
```
