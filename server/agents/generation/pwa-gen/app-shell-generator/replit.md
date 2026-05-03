# App Shell Generator (HVP)

## 1. Module Purpose
- Builds an App Shell oriented HTML response for Progressive Web Apps.
- Optimizes first paint by generating deterministic critical CSS, preload hints, route chunk loading plans, and selective hydration instructions.

## 2. File Responsibilities
- `types.ts`: shared contracts (`AppShellInput`, `AppShellOutput`, `ShellLayout`, `HydrationPlan`) and related immutable DTO shapes.
- `state.ts`: immutable state snapshot derived from input (`loadingStrategy`, `routes`, `assets`, `performanceTargets`).
- `orchestrator.ts`: layer L1 coordinator only; executes fixed pipeline and returns final immutable output contract.
- `index.ts`: exports only orchestrator to avoid internal leakage.
- `agents/shell-layout.agent.ts`: produces static app shell layout (header, root, skeleton).
- `agents/critical-css.agent.ts`: computes above-the-fold CSS and strips render-blocking footprint via minification.
- `agents/preload-strategy.agent.ts`: chooses and builds preload hints for highest-value assets.
- `agents/dynamic-import.agent.ts`: creates route-level lazy chunk import expressions for code splitting.
- `agents/hydration-strategy.agent.ts`: produces deterministic hydration mode + boundary bootstrap plan.
- `utils/html-template.util.ts`: combines layout + CSS + preload + hydration payload into final HTML template.
- `utils/css-minifier.util.ts`: removes comments/whitespace and deduplicates declarations.
- `utils/preload-builder.util.ts`: converts prioritized assets into `<link rel="preload">` tags.

## 3. Call Flow
`orchestrator`
→ `shell-layout.agent`
→ `critical-css.agent`
→ `preload-strategy.agent`
→ `dynamic-import.agent`
→ `hydration-strategy.agent`
→ `utils`

## 4. Import Rules
- `orchestrator` imports from `agents` + `utils` + `state/types` only.
- `agents` import from `utils` and `types` only.
- `utils` remain stateless and pure.
- No `agent -> agent` imports.

## 5. Output Contract
Returns immutable object:

```ts
{
  success: true,
  logs: string[],
  data: {
    htmlShell: string,
    criticalCSS: string,
    preloadLinks: string[],
    lazyChunks: { path: string; importExpression: string }[],
    hydrationPlan: HydrationPlan
  }
}
```
