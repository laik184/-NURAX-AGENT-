# Android Navigation (HVP)

## 1) Navigation Flow
The orchestrator executes a strict, pure-navigation pipeline:
1. Parse and validate incoming screen configs.
2. Generate type-safe routes with param metadata.
3. Build a full Compose-compatible navigation graph.
4. Attach deep-link mappings to each route.
5. Apply guard policy defaults.
6. Return a frozen navigation output payload.

Flow summary:
`orchestrator -> route-generator -> navgraph-builder -> deep-link -> guard`

## 2) File Responsibilities

### L1
- `orchestrator.ts`: coordinates build flow only (no business logic).

### L2 (`agents/`)
- `navgraph-builder.agent.ts`: builds full `NavGraph`.
- `route-generator.agent.ts`: generates routes + params.
- `navigation-handler.agent.ts`: resolves `navigate()` targets and concrete paths.
- `deep-link.agent.ts`: creates route-to-deep-link mappings.
- `backstack-manager.agent.ts`: manages push/replace/pop stack behavior.
- `guard.agent.ts`: evaluates auth/permission access gates.

### L3 (`utils/`)
- `route-parser.util.ts`: parses route templates and placeholder params.
- `param-mapper.util.ts`: maps runtime params into route paths.
- `nav-constants.util.ts`: shared constants and scopes.
- `validation.util.ts`: validates screen and route consistency.
- `logger.util.ts`: normalized logging helpers.

### L0
- `types.ts`: canonical navigation contracts.
- `state.ts`: immutable state shape + update helpers.

### Public API
- `index.ts`: exports `buildNavigation()`, `navigateTo()`, `getRoutes()`.

## 3) Import Structure
- Downward-only dependency model:
  - `orchestrator.ts` imports `agents`, `state`, `utils`, `types`.
  - `agents/*` import only `utils` and `types`.
  - `utils/*` are helper-only.
  - `types.ts` and `state.ts` are foundational.
- No agent imports another agent.
- No UI, API, or DB coupling.

## 4) Route System
- Route templates are declared in `ScreenConfig.path`, e.g. `profile/{userId}`.
- `route-generator` derives stable route IDs (`<screenId>.route`) and typed arg lists.
- `param-mapper` encodes runtime values for safe navigation path generation.
- Runtime `navigateTo()` resolves by route ID or screen ID for ergonomic use.

## 5) Deep Link Handling
- Each screen can declare `deepLinks` URI patterns.
- `deep-link.agent.ts` creates explicit `DeepLinkConfig[]` mappings.
- `navgraph-builder` also embeds per-destination deep-link patterns for graph-level composition.
- Final output includes a dedicated `deepLinks` section for integration with Android intent filters.
