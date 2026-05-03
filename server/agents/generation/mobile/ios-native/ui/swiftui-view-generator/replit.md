# SwiftUI View Generator

## 1) SwiftUI generation flow

1. `orchestrator.ts` receives `ScreenConfig`.
2. `layout-generator.agent.ts` prepares layout containers (`VStack/HStack/ZStack`).
3. `component-generator.agent.ts` creates reusable visual elements.
4. `list-generator.agent.ts` and `form-generator.agent.ts` generate optional dynamic sections.
5. `navigation-generator.agent.ts` wraps content in navigation flow.
6. `view-builder.agent.ts` assembles the final screen body.
7. Orchestrator builds `struct View`, formats code, and returns output.

Flow: **orchestrator → layout/components/list/form → navigation → view-builder → final code**.

## 2) File responsibilities

- `orchestrator.ts`: coordinates all generation steps; no UI business logic.
- `agents/view-builder.agent.ts`: assembles final screen body.
- `agents/layout-generator.agent.ts`: generates layout wrappers.
- `agents/component-generator.agent.ts`: generates reusable components.
- `agents/list-generator.agent.ts`: builds list/lazy stack UIs.
- `agents/form-generator.agent.ts`: builds form and validation UI states.
- `agents/navigation-generator.agent.ts`: applies `NavigationStack` and titles.
- `utils/*`: syntax, naming, formatting, and logging helpers only.
- `types.ts`: generator contracts (`ScreenConfig`, `SwiftUIViewOutput`, etc).
- `state.ts`: immutable generation state and status.
- `index.ts`: public API exports.

## 3) Import structure

- HVP layering is enforced:
  - **L1** `orchestrator.ts` imports **L2** agents, **L3** utils, and **L0** types/state.
  - **L2** agents import only **L3** utils + **L0** types.
  - **L3** utils import nothing higher.
- No upward imports.
- No agent-to-agent imports.

## 4) Example screen generation

```ts
import { generateSwiftUIView } from "./index.js";

const result = generateSwiftUIView({
  screenName: "Profile",
  layout: { type: "VStack", spacing: 16 },
  components: [
    { id: "title", type: "text", value: "My Profile" },
    { id: "edit", type: "button", title: "Edit Profile", actionName: "onEditTap" },
  ],
  navigation: { useNavigationStack: true, title: "Profile" },
  list: { enabled: true, style: "list", itemBindingName: "items" },
  form: {
    enabled: true,
    fields: [
      { id: "name", label: "Name", type: "text", binding: "name", required: true },
    ],
  },
});
```

This produces a formatted SwiftUI `ProfileView` compatible with MVVM-friendly architecture and reusable component composition.
