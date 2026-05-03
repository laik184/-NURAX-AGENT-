import type { GenerationFile, SliceConfig, StateConfig } from "../types.js";
import { toCamelCase, toPascalCase } from "../utils/naming.util.js";

export function generateSliceFiles(config: StateConfig): readonly SliceConfig[] {
  if (config.stateLibrary === "context") {
    return Object.freeze([]);
  }

  const files = config.modules.map((moduleName) => {
    const camelName = toCamelCase(moduleName);
    const pascalName = toPascalCase(moduleName);

    const content =
      config.stateLibrary === "redux"
        ? `import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ${pascalName}State {
  value: number;
}

const initialState: ${pascalName}State = Object.freeze({
  value: 0,
});

const ${camelName}Slice = createSlice({
  name: "${camelName}",
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    setValue: (state, action: PayloadAction<number>) => {
      state.value = action.payload;
    },
  },
});

export const ${camelName}Reducer = ${camelName}Slice.reducer;
export const ${camelName}Actions = ${camelName}Slice.actions;
`
        : `export interface ${pascalName}Slice {
  value: number;
  increment: () => void;
  setValue: (value: number) => void;
}

export const create${pascalName}Slice = (set: (updater: (state: ${pascalName}Slice) => Partial<${pascalName}Slice>) => void): ${pascalName}Slice => ({
  value: 0,
  increment: () => set((state) => ({ value: state.value + 1 })),
  setValue: (value) => set(() => ({ value })),
});
`;

    return {
      moduleName: camelName,
      filePath: `src/state/slices/${camelName}.slice.ts`,
      code: content,
    };
  });

  return Object.freeze([...files]);
}

export function generateSliceRegistry(config: StateConfig, slices: readonly SliceConfig[]): GenerationFile {
  if (config.stateLibrary !== "redux") {
    return {
      path: "src/state/slices/index.ts",
      content: `export {};
`,
    };
  }

  const importLines = slices
    .map((slice) => `import { ${slice.moduleName}Reducer } from "./${slice.moduleName}.slice";`)
    .join("\n");

  const reducerMap = slices.map((slice) => `  ${slice.moduleName}: ${slice.moduleName}Reducer,`).join("\n");

  return {
    path: "src/state/slices/index.ts",
    content: `import { combineReducers } from "@reduxjs/toolkit";
${importLines}

export const rootReducer = combineReducers({
${reducerMap}
});
`,
  };
}
