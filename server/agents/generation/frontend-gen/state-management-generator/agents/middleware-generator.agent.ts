import type { GenerationFile, StateConfig } from "../types.js";

export function generateMiddlewareFile(config: StateConfig): GenerationFile {
  if (config.stateLibrary === "redux") {
    return {
      path: "src/state/middleware/index.ts",
      content: `import type { Middleware } from "@reduxjs/toolkit";

export const loggerMiddleware: Middleware = () => (next) => (action) => {
  return next(action);
};

export const middleware = [loggerMiddleware];
`,
    };
  }

  if (config.stateLibrary === "zustand") {
    return {
      path: "src/state/middleware/index.ts",
      content: `export const middleware = ["zustand-devtools", "zustand-logger"] as const;
`,
    };
  }

  return {
    path: "src/state/middleware/index.ts",
    content: `export const middleware = ["context-logger"] as const;
`,
  };
}
