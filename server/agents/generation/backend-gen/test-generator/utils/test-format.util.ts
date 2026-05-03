import type { Assertion, TestSuite } from "../types";
import { loadArrangeActAssertTemplate } from "./template-loader.util";

export const formatTestSuite = (suite: TestSuite, assertions: Assertion[]): string => {
  const tests = suite.testCases
    .map((testCase) => {
      const matchingAssertions = assertions
        .filter((assertion) => assertion.testCaseId === testCase.id)
        .map((assertion) => assertion.expression);

      return loadArrangeActAssertTemplate(testCase, matchingAssertions);
    })
    .join("\n\n");

  const imports = suite.imports.join("\n");
  const mocks = suite.mocks.map((mock) => `  ${mock}`).join("\n");

  return [
    imports,
    "",
    `describe(\"${suite.target}\", () => {`,
    "  beforeEach(() => {",
    mocks || "    // no mocks configured",
    "  });",
    "",
    tests,
    "});",
    "",
  ].join("\n");
};
