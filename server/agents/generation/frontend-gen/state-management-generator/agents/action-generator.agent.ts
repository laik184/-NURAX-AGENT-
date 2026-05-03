import type { ActionConfig, StateConfig } from "../types.js";
import { toCamelCase } from "../utils/naming.util.js";

export function generateActionFiles(config: StateConfig): readonly ActionConfig[] {
  const actions = config.modules.map((moduleName) => {
    const normalized = toCamelCase(moduleName);
    const code =
      config.stateLibrary === "redux"
        ? `import type { AppDispatch } from "../store";
import { ${normalized}Actions } from "../slices/${normalized}.slice";

export const increment${capitalize(normalized)} = () => (dispatch: AppDispatch) => {
  dispatch(${normalized}Actions.increment());
};

export const set${capitalize(normalized)}Value =
  (value: number) => (dispatch: AppDispatch) => {
    dispatch(${normalized}Actions.setValue(value));
  };
`
        : config.stateLibrary === "zustand"
          ? `import { useAppStore } from "../store";

export const increment${capitalize(normalized)} = (): void => {
  const current = useAppStore.getState();
  useAppStore.setState({ ${normalized}Value: current.${normalized}Value + 1 });
};

export const set${capitalize(normalized)}Value = (value: number): void => {
  useAppStore.setState({ ${normalized}Value: value });
};
`
          : `export type ${capitalize(normalized)}Action =
  | { type: "${normalized}/increment" }
  | { type: "${normalized}/setValue"; payload: number };

export const increment${capitalize(normalized)} = (): ${capitalize(normalized)}Action => ({
  type: "${normalized}/increment",
});

export const set${capitalize(normalized)}Value = (value: number): ${capitalize(normalized)}Action => ({
  type: "${normalized}/setValue",
  payload: value,
});
`;

    return {
      moduleName: normalized,
      filePath: `src/state/actions/${normalized}.actions.ts`,
      code,
    };
  });

  return Object.freeze([...actions]);
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}
