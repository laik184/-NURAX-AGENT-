import type { TestCase } from "../types";

export const loadArrangeActAssertTemplate = (testCase: TestCase, assertionLines: string[]): string => {
  const arrange = testCase.arrange.map((line) => `      ${line}`).join("\n");
  const act = testCase.act.map((line) => `      ${line}`).join("\n");
  const assert = assertionLines.map((line) => `      ${line}`).join("\n");

  return [
    `  it(\"${testCase.title}\", async () => {`,
    "    // Arrange",
    arrange || "      // no setup required",
    "",
    "    // Act",
    act || "      // no action required",
    "",
    "    // Assert",
    assert || "      expect(true).toBe(true);",
    "  });",
  ].join("\n");
};
