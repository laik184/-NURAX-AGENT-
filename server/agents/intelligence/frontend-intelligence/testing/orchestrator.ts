import type {
  ComponentDescriptor,
  TestFileDescriptor,
  TestingAnalysisInput,
  TestingAnalysisReport,
} from "./types.js";
import {
  initSession,
  setStage,
  storeIntermediateMapping,
  clearSession,
} from "./state.js";
import { detectPresence } from "./agents/presence-detector.agent.js";
import { mapComponentsToTests } from "./agents/component-test-mapper.agent.js";
import { detectCriticalComponents } from "./agents/critical-component.detector.agent.js";
import { detectMissingTests } from "./agents/missing-test-detector.agent.js";
import {
  buildCoverageBreakdown,
  deriveSeverity,
} from "./agents/coverage-estimator.agent.js";

const EMPTY_REPORT: TestingAnalysisReport = Object.freeze({
  sessionId: "invalid",
  analyzedAt: 0,
  presenceResult: Object.freeze({
    hasTests: false,
    totalTestFiles: 0,
    frameworks: Object.freeze([]),
    testToSourceRatio: 0,
  }),
  componentMappings: Object.freeze([]),
  missingTestIssues: Object.freeze([]),
  criticalComponents: Object.freeze([]),
  coverageScore: 0,
  scoreBreakdown: Object.freeze({
    presenceScore: 0,
    mappingScore: 0,
    criticalCoverageScore: 0,
    testQualityScore: 0,
    overall: 0,
  }),
  severity: "CRITICAL",
  totalIssues: 0,
  summary:
    "Invalid input: sessionId (string), components (ComponentDescriptor[]), and testFiles (TestFileDescriptor[]) are required.",
});

const VALID_COMPONENT_TYPES = new Set<string>([
  "page", "layout", "form", "context", "hook", "ui", "util",
]);

const VALID_FRAMEWORKS = new Set<string>([
  "jest", "vitest", "playwright", "cypress", "testing-library", "unknown",
]);

function isValidComponent(item: unknown): item is ComponentDescriptor {
  if (!item || typeof item !== "object") return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c["id"] === "string" &&
    c["id"].trim() !== "" &&
    typeof c["name"] === "string" &&
    c["name"].trim() !== "" &&
    typeof c["filePath"] === "string" &&
    typeof c["type"] === "string" &&
    VALID_COMPONENT_TYPES.has(c["type"] as string) &&
    typeof c["hasProps"] === "boolean" &&
    typeof c["hasState"] === "boolean" &&
    typeof c["hasEffects"] === "boolean" &&
    typeof c["isExported"] === "boolean"
  );
}

function isValidTestFile(item: unknown): item is TestFileDescriptor {
  if (!item || typeof item !== "object") return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t["id"] === "string" &&
    t["id"].trim() !== "" &&
    typeof t["filePath"] === "string" &&
    Array.isArray(t["testedComponentNames"]) &&
    (t["testedComponentNames"] as unknown[]).every((n) => typeof n === "string") &&
    typeof t["testFramework"] === "string" &&
    VALID_FRAMEWORKS.has(t["testFramework"] as string) &&
    typeof t["testCount"] === "number" &&
    (t["testCount"] as number) >= 0
  );
}

function validateInput(raw: unknown): raw is TestingAnalysisInput {
  if (!raw || typeof raw !== "object") return false;
  const i = raw as Record<string, unknown>;
  if (typeof i["sessionId"] !== "string" || i["sessionId"].trim() === "") return false;
  if (!Array.isArray(i["components"])) return false;
  if (!Array.isArray(i["testFiles"])) return false;
  return (
    (i["components"] as unknown[]).every(isValidComponent) &&
    (i["testFiles"] as unknown[]).every(isValidTestFile)
  );
}

function buildSummary(
  score: number,
  severity: string,
  totalIssues: number,
  totalComponents: number,
  totalTestFiles: number
): string {
  if (totalComponents === 0) {
    return `Test coverage score: ${score}/100 — ${severity}. No components provided.`;
  }
  if (totalIssues === 0) {
    return (
      `Test coverage score: ${score}/100 — ${severity}. ` +
      `${totalComponents} component${totalComponents === 1 ? "" : "s"} and ` +
      `${totalTestFiles} test file${totalTestFiles === 1 ? "" : "s"} analyzed. All components have test coverage.`
    );
  }
  return (
    `Test coverage score: ${score}/100 — ${severity}. ` +
    `${totalComponents} component${totalComponents === 1 ? "" : "s"} analyzed; ` +
    `${totalIssues} issue${totalIssues === 1 ? "" : "s"} detected across missing tests and critical coverage gaps.`
  );
}

export function analyzeTesting(rawInput: unknown): TestingAnalysisReport {
  if (!validateInput(rawInput)) return EMPTY_REPORT;

  const input = rawInput as TestingAnalysisInput;
  const { sessionId, components, testFiles } = input;

  if (components.length === 0) {
    return Object.freeze({
      sessionId,
      analyzedAt: Date.now(),
      presenceResult: Object.freeze({
        hasTests: testFiles.length > 0,
        totalTestFiles: testFiles.length,
        frameworks: Object.freeze([]),
        testToSourceRatio: 0,
      }),
      componentMappings: Object.freeze([]),
      missingTestIssues: Object.freeze([]),
      criticalComponents: Object.freeze([]),
      coverageScore: 100,
      scoreBreakdown: Object.freeze({
        presenceScore: 100,
        mappingScore: 100,
        criticalCoverageScore: 100,
        testQualityScore: 100,
        overall: 100,
      }),
      severity: "NONE" as const,
      totalIssues: 0,
      summary: "No components provided. Test coverage score: 100/100.",
    });
  }

  initSession(input);

  setStage("presence");
  const presenceResult = detectPresence(testFiles, components.length);

  setStage("mapping");
  const componentMappings = mapComponentsToTests(components, testFiles);

  setStage("critical-detection");
  const criticalComponents = detectCriticalComponents(components, componentMappings);

  setStage("missing-tests");
  const missingTestIssues = detectMissingTests(components, componentMappings);

  setStage("coverage-estimation");
  storeIntermediateMapping(componentMappings, criticalComponents);

  const scoreBreakdown = buildCoverageBreakdown(
    presenceResult,
    componentMappings,
    criticalComponents,
    testFiles
  );

  const coverageScore = scoreBreakdown.overall;
  const severity = deriveSeverity(coverageScore);

  const totalIssues =
    missingTestIssues.length +
    criticalComponents.filter((c) => !c.isTested).length;

  const summary = buildSummary(
    coverageScore,
    severity,
    totalIssues,
    components.length,
    testFiles.length
  );

  setStage("complete");
  clearSession();

  return Object.freeze({
    sessionId,
    analyzedAt: Date.now(),
    presenceResult,
    componentMappings,
    missingTestIssues,
    criticalComponents,
    coverageScore,
    scoreBreakdown,
    severity,
    totalIssues,
    summary,
  });
}
