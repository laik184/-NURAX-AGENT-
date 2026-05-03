import type { TestFramework } from "../types";

export const buildTestFrameworkImport = (framework: TestFramework): string => {
  if (framework === "vitest") {
    return `import { describe, it, expect, vi, beforeEach } from "vitest";`;
  }

  return `import { describe, it, expect, jest, beforeEach } from "@jest/globals";`;
};

export const buildTargetImport = (target: string, fromPath: string): string =>
  `import { ${target} } from "${fromPath}";`;
