import type { GenerationFile, StateConfig } from "../types.js";

export function generateProviderFile(config: StateConfig): GenerationFile {
  if (config.stateLibrary === "redux") {
    return {
      path: "src/state/provider.tsx",
      content: `import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { store } from "./store";

export function AppStateProvider({ children }: PropsWithChildren): JSX.Element {
  return <Provider store={store}>{children}</Provider>;
}
`,
    };
  }

  if (config.stateLibrary === "zustand") {
    return {
      path: "src/state/provider.tsx",
      content: `import type { PropsWithChildren } from "react";

export function AppStateProvider({ children }: PropsWithChildren): JSX.Element {
  return <>{children}</>;
}
`,
    };
  }

  return {
    path: "src/state/provider.tsx",
    content: `import { useMemo, type PropsWithChildren } from "react";
import { AppStateContext, initialAppState } from "./store";

export function AppStateProvider({ children }: PropsWithChildren): JSX.Element {
  const value = useMemo(() => initialAppState, []);
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
`,
  };
}
