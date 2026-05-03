import { generateFrontendTest } from "./orchestrator.js";
import type { GenerateTestInput, TestResult } from "./types.js";

export function generateComponentTest(input: Omit<GenerateTestInput, "preferredTestType">): Readonly<TestResult> {
  return generateFrontendTest({
    ...input,
    preferredTestType: "component",
  });
}

export function generatePageTest(input: Omit<GenerateTestInput, "preferredTestType">): Readonly<TestResult> {
  return generateFrontendTest({
    ...input,
    preferredTestType: "page",
  });
}

export function generateFormTest(input: Omit<GenerateTestInput, "preferredTestType">): Readonly<TestResult> {
  return generateFrontendTest({
    ...input,
    preferredTestType: "form",
  });
}

export { generateFrontendTest };
export type { GenerateTestInput, TestResult } from "./types.js";
