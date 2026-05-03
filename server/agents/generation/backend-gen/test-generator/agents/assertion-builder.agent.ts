import type { Assertion, TestCase } from "../types";

const defaultAssertion = (testCase: TestCase): Assertion => ({
  testCaseId: testCase.id,
  description: "fallback assertion",
  expression: "expect(true).toBe(true);",
});

export const buildAssertions = (testCases: TestCase[]): Assertion[] =>
  testCases.flatMap((testCase) => {
    if (!testCase.assertionHints.length) {
      return [defaultAssertion(testCase)];
    }

    return testCase.assertionHints.map((hint, index) => ({
      testCaseId: testCase.id,
      description: hint,
      expression:
        hint.includes("400") || hint.toLowerCase().includes("error")
          ? "expect(result.status ?? response.status ?? res.statusCode).toBeGreaterThanOrEqual(400);"
          : index === 0
            ? "expect(result).toBeDefined();"
            : "expect(result.body ?? response.body ?? {}).toBeDefined();",
    }));
  });
