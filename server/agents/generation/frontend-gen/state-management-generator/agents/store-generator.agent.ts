import type { GenerationFile, StateConfig } from "../types.js";
import { toCamelCase } from "../utils/naming.util.js";

export function generateStoreFile(config: StateConfig): GenerationFile {
  if (config.stateLibrary === "redux") {
    return {
      path: "src/state/store.ts",
      content: `import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./slices";

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`,
    };
  }

  if (config.stateLibrary === "zustand") {
    const moduleFields = config.modules.map((moduleName) => `${toCamelCase(moduleName)}Value: number;`).join("\n  ");
    const moduleSetters = config.modules
      .map((moduleName) => `set${capitalize(toCamelCase(moduleName))}Value: (value: number) => void;`)
      .join("\n  ");
    const initializers = config.modules.map((moduleName) => `${toCamelCase(moduleName)}Value: 0,`).join("\n  ");
    const setters = config.modules
      .map(
        (moduleName) =>
          `set${capitalize(toCamelCase(moduleName))}Value: (value) => set(() => ({ ${toCamelCase(moduleName)}Value: value })),`,
      )
      .join("\n  ");

    return {
      path: "src/state/store.ts",
      content: `import { create } from "zustand";

export interface AppState {
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  ${moduleFields}
  ${moduleSetters}
}

export const useAppStore = create<AppState>((set) => ({
  hydrated: false,
  setHydrated: (value) => set({ hydrated: value }),
  ${initializers}
  ${setters}
}));
`,
    };
  }

  const contextFields = config.modules.map((moduleName) => `${toCamelCase(moduleName)}Value: number;`).join("\n  ");

  return {
    path: "src/state/store.ts",
    content: `import { createContext } from "react";

export interface AppState {
  hydrated: boolean;
  ${contextFields}
}

export const initialAppState: AppState = Object.freeze({
  hydrated: false,
  ${config.modules.map((moduleName) => `${toCamelCase(moduleName)}Value: 0,`).join("\n  ")}
});

export const AppStateContext = createContext<AppState>(initialAppState);
`,
  };
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
