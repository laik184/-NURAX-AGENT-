import type { CoverageReport, TestCase, TestType } from "../types.js";

const BASE_AREAS: Readonly<Record<TestType, readonly string[]>> = Object.freeze({
  component: Object.freeze(["render", "props", "conditional-ui"]),
  page: Object.freeze(["render", "navigation", "routing-guards"]),
  form: Object.freeze(["inputs", "validation", "submit"]),
  api: Object.freeze(["request", "response-success", "response-error"]),
  interaction: Object.freeze(["click", "typing", "focus"]),
});

export function analyzeCoverage(testType: TestType, testCases: readonly TestCase[]): Readonly<CoverageReport> {
  const requiredAreas = BASE_AREAS[testType];
  const tagSet = new Set(testCases.flatMap((testCase) => testCase.tags));
  const coveredAreas = requiredAreas.filter((area) => tagSet.has(area));
  const missingAreas = requiredAreas.filter((area) => !tagSet.has(area));
  const coverage = Math.round((coveredAreas.length / requiredAreas.length) * 100);

  return Object.freeze({
    coverage,
    coveredAreas: Object.freeze([...coveredAreas]),
    missingAreas: Object.freeze([...missingAreas]),
  });
}
