import type { ComponentPlan, GeneratedFile } from "../types.js";
import { buildFilePath } from "../utils/file-structure.util.js";
import { formatCode } from "../utils/formatter.util.js";

export function generateTestFile(plan: Readonly<ComponentPlan>): GeneratedFile {
  const testBody = plan.framework === "vue"
    ? `import { describe, it, expect } from "vitest";

describe("${plan.normalizedName}", () => {
  it("loads component definition", async () => {
    const component = await import("./${plan.componentFileName}");
    expect(component).toBeDefined();
  });
});`
    : `import { describe, it, expect } from "vitest";
import { ${plan.normalizedName} } from "./${plan.componentFileName.replace(/\.tsx$/, "")}";

describe("${plan.normalizedName}", () => {
  it("exports component", () => {
    expect(${plan.normalizedName}).toBeTypeOf("function");
  });
});`;

  return Object.freeze({
    path: buildFilePath(plan, plan.testFileName),
    content: formatCode(testBody),
    language: "tsx",
  });
}
