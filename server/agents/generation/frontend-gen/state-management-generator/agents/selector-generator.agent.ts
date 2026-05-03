import type { SelectorConfig, StateConfig } from "../types.js";
import { toCamelCase } from "../utils/naming.util.js";

export function generateSelectorFiles(config: StateConfig): readonly SelectorConfig[] {
  return Object.freeze(
    config.modules.map((moduleName) => {
      const normalized = toCamelCase(moduleName);
      const code =
        config.stateLibrary === "redux"
          ? `import type { RootState } from "../store";

export const select${capitalize(normalized)}Value = (state: RootState): number => state.${normalized}.value;
`
          : config.stateLibrary === "zustand"
            ? `import { useAppStore } from "../store";

export const select${capitalize(normalized)}Value = (): number => useAppStore((state) => state.${normalized}Value);
`
            : `import { useContext } from "react";
import { AppStateContext } from "../store";

export const select${capitalize(normalized)}Value = (): number => {
  const state = useContext(AppStateContext);
  return state.${normalized}Value;
};
`;

      return {
        moduleName: normalized,
        filePath: `src/state/selectors/${normalized}.selectors.ts`,
        code,
      };
    }),
  );
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
