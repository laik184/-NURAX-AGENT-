# Style Generator - Production Grade Responsive UI Engine

## File Responsibilities

### L0
- `types.ts`: Defines deterministic contracts for input, output and style system domains.
- `state.ts`: Immutable state helpers for active theme mode and active breakpoint.

### L1
- `orchestrator.ts`: Only coordinates agents in strict order; no independent business logic.

### L2 Agents
- `breakpoint-manager.agent.ts`: Defines breakpoints and detects active breakpoint.
- `responsive-engine.agent.ts`: Maps responsive style objects for each media query range.
- `layout-system.agent.ts`: Builds grid/flex layout for current breakpoint.
- `spacing-scale.agent.ts`: Generates 4/8/16-aligned spacing scale.
- `typography-scale.agent.ts`: Generates responsive typographic scale.
- `color-system.agent.ts`: Generates semantic color tokens.
- `theme-generator.agent.ts`: Produces theme token map.
- `dark-mode.agent.ts`: Resolves light/dark mode deterministically.
- `accessibility-style.agent.ts`: Enforces contrast and readability targets.
- `animation-style.agent.ts`: Produces transition and motion tokens.
- `stylesheet-builder.agent.ts`: Builds final CSS string from generated systems.

### L3 Utils
- `deep-freeze.util.ts`: Deep immutable output utility.
- `unit-converter.util.ts`: Converts `px` to `rem`/`em`.
- `media-query-builder.util.ts`: Builds deterministic media query strings.
- `style-merger.util.ts`: Merges style object fragments.
- `validation.util.ts`: Validates orchestrator input.

## Orchestrator Call Order
1. `breakpoint-manager`
2. `responsive-engine`
3. `layout-system`
4. `spacing-scale`
5. `typography-scale`
6. `color-system`
7. `theme-generator`
8. `dark-mode`
9. `accessibility-style`
10. `animation-style`
11. `stylesheet-builder`

## Data Flow Diagram
`input -> validation -> breakpoint -> responsive -> layout -> spacing -> typography -> colors -> theme -> accessibility -> animation -> stylesheet -> deep-freeze output`

## Input / Output Structure
### Input (`StyleGeneratorInput`)
- `viewportWidth: number`
- `themeMode?: "light" | "dark"`
- `prefersReducedMotion?: boolean`
- `highContrast?: boolean`
- `baseFontPx?: number`

### Output (`StyleGeneratorResult`)
```ts
{
  success: true,
  logs: string[],
  data: ResponsiveStyleSystem
}
```
