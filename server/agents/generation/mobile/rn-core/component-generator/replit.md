# React Native Component Generator Module

## 1. Module Overview

This module deterministically generates React Native UI component JSX strings from a normalized request object. It is organized with strict HVP layering:

- **L1**: `orchestrator.ts` for coordination only.
- **L2**: `agents/*` for component-specific UI building.
- **L3**: `utils/*` for prop/style/accessibility/template helpers.
- **L0**: `types.ts` and `state.ts` for shared contracts and immutable state transitions.

The module has no side effects, no network/storage logic, and no cross-module imports.

## 2. File Responsibilities

- `types.ts`: Defines `ComponentRequest`, `ComponentOutput`, and supported component union types.
- `state.ts`: Immutable state factory and state transitions for logs and processed props.
- `orchestrator.ts`: Validates input, normalizes props, routes to an agent, and standardizes output.
- `agents/view-builder.agent.ts`: Generates `View`, `SafeAreaView`, and `ScrollView` JSX.
- `agents/text-builder.agent.ts`: Generates `Text` JSX with accessibility defaults.
- `agents/touchable-builder.agent.ts`: Generates `Button`, `Pressable`, or `TouchableOpacity` JSX.
- `agents/list-builder.agent.ts`: Generates `FlatList` or `SectionList` JSX with performance-focused defaults.
- `agents/input-builder.agent.ts`: Generates `TextInput` JSX for validation-ready input flows.
- `agents/image-builder.agent.ts`: Generates `Image` JSX with fallback and loading defaults.
- `agents/modal-builder.agent.ts`: Generates `Modal` JSX with overlay and animation defaults.
- `agents/icon-builder.agent.ts`: Generates `Icon` JSX compatible with `react-native-vector-icons` style props.
- `utils/props-normalizer.util.ts`: Applies defaults, merges style, removes invalid props.
- `utils/style-merger.util.ts`: Safely merges base and override styles.
- `utils/accessibility.util.ts`: Builds deterministic accessibility labels/roles.
- `utils/component-template.util.ts`: Converts prop objects into JSX template output.
- `index.ts`: Public exports for orchestrator and contracts.

## 3. Flow Diagram

User Input  
→ `orchestrator.ts`  
→ `agents/*`  
→ `utils/*`  
→ final JSX output

## 4. Import Rules

- Agents do **not** import other agents.
- Utilities do **not** import agents.
- Orchestrator coordinates agents + utils.
- No dependencies on external modules outside this generator scope.

## 5. Example Usage

```ts
import { generateReactNativeComponent } from "./orchestrator.js";

const result = generateReactNativeComponent({
  type: "text",
  props: { children: "Hello HVP" },
  style: { fontSize: 16, color: "#111827" },
});

// {
//   success: true,
//   code: "<Text ...>Hello HVP</Text>",
//   logs: [...]
// }
```
