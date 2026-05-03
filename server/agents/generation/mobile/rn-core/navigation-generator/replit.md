# Navigation Generator (React Navigation Architect AI)

## 1. MODULE PURPOSE
This module generates a complete mobile navigation system for React Native applications:
- Stack navigation
- Tab navigation
- Drawer navigation
- Auth/App flow switching
- Deep linking configuration

## 2. FILE RESPONSIBILITY
- `types.ts`: Module-level contracts and shared types.
- `state.ts`: Navigation state defaults (`routes`, `authRequired`, `initialRoute`).
- `orchestrator.ts`: L1 coordinator that executes workflow steps and merges results.
- `index.ts`: Public API export only.

### Agents (L2)
- `agents/stack-navigator.agent.ts`: Builds stack hierarchy, header options, push/pop flow metadata.
- `agents/tab-navigator.agent.ts`: Builds bottom tabs, labels, icons, switching metadata.
- `agents/drawer-navigator.agent.ts`: Builds drawer menu + route mapping.
- `agents/auth-navigator.agent.ts`: Builds auth vs app switching and protected-route policy metadata.
- `agents/deep-link.agent.ts`: Builds deep-link prefixes, route mappings, URL handling metadata.

### Utils (L3)
- `utils/route-normalizer.util.ts`: Cleans route names and removes duplicates.
- `utils/screen-mapper.util.ts`: Maps route names to screen component descriptors.
- `utils/navigation-config.util.ts`: Input validation, normalization, and final output builder.

## 3. DATA FLOW
`input -> orchestrator -> agents -> utils -> output`

1. Orchestrator validates and normalizes input.
2. Orchestrator normalizes routes and creates screen mappings.
3. Orchestrator calls agents (stack/tab/drawer/auth/deep-link).
4. Orchestrator merges agent outputs via config util.
5. Final immutable HVP output is returned.

## 4. IMPORT FLOW
- Allowed direction: `orchestrator -> agents -> utils`
- `types.ts` and `state.ts` are base layers.
- No reverse imports.
- No agent-to-agent imports.

## 5. OUTPUT FORMAT
All public outputs follow immutable HVP contract:

```ts
{
  success: boolean,
  logs: string[],
  error?: string,
  data?: any
}
```
