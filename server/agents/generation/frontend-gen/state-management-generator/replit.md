# State Management Generator

## 1) Module overview
This module generates frontend state architecture artifacts for React and Next projects, supporting Redux Toolkit, Zustand, and Context API.

## 2) File responsibilities
- `orchestrator.ts`: Coordinates detection, generation, writing, and output assembly.
- `types.ts`: Shared contracts for config and generation artifacts.
- `state.ts`: Immutable runtime state; only orchestrator token can mutate it.
- `agents/store-generator.agent.ts`: Creates `store.ts` output.
- `agents/slice-generator.agent.ts`: Creates slices and Redux slice registry.
- `agents/action-generator.agent.ts`: Creates actions/dispatch adapters.
- `agents/selector-generator.agent.ts`: Creates selectors.
- `agents/middleware-generator.agent.ts`: Creates middleware configuration.
- `agents/provider-generator.agent.ts`: Creates app provider wrapper.
- `utils/template-loader.util.ts`: Library/provider package lookup helpers.
- `utils/naming.util.ts`: Naming normalization helpers.
- `utils/file-writer.util.ts`: File writing helper.
- `utils/validation.util.ts`: Validation, supported libraries, deduplication.
- `index.ts`: Public exports.

## 3) Redux vs Zustand flow
- Redux Toolkit flow: orchestrator -> store generator -> slice generator -> action generator -> selector generator -> middleware generator -> provider generator.
- Zustand flow: orchestrator -> store generator -> slice generator (state shape) -> action generator -> selector generator -> middleware generator -> provider generator.
- Context flow: orchestrator -> store generator -> action generator -> selector generator -> middleware generator -> provider generator.

## 4) Import relationships
- L1 (`orchestrator.ts`) imports L2 agents + L3 utils + L0 state/types.
- L2 agents import only L3 utils and L0 types.
- L3 utils import only L0 types or node APIs.
- No agent-to-agent imports.

## 5) Example generated files
- `src/state/store.ts`
- `src/state/slices/cart.slice.ts`
- `src/state/actions/cart.actions.ts`
- `src/state/selectors/cart.selectors.ts`
- `src/state/middleware/index.ts`
- `src/state/provider.tsx`
