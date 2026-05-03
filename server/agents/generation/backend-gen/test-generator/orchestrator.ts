import { buildAssertions } from "./agents/assertion-builder.agent";
import { generateControllerTestSuites } from "./agents/controller-test.agent";
import { generateIntegrationTestSuites } from "./agents/integration-test.agent";
import { generateMockData } from "./agents/mock-data-generator.agent";
import { generateRouteTestSuites } from "./agents/route-test.agent";
import { generateServiceTestSuites } from "./agents/service-test.agent";
import { GeneratorStateStore } from "./state";
import type { GeneratedTestFile, GeneratorInput, TestResult, TestSuite } from "./types";
import { formatTestSuite } from "./utils/test-format.util";

const estimateCoverage = (modulesCount: number, suitesCount: number): number => {
  if (modulesCount === 0) {
    return 0;
  }

  const baseline = Math.min(60, modulesCount * 10);
  const suiteContribution = Math.min(40, suitesCount * 4);
  return Math.min(100, baseline + suiteContribution);
};

const ensureUniqueFileNames = (files: GeneratedTestFile[], state: GeneratorStateStore): GeneratedTestFile[] => {
  const seen = new Set<string>();

  return files.filter((file) => {
    if (seen.has(file.path)) {
      state.appendLog(`Duplicate generated file removed: ${file.path}`);
      return false;
    }

    seen.add(file.path);
    return true;
  });
};

export const generateBackendTests = (input: GeneratorInput): Readonly<TestResult> => {
  const framework = input.framework || "vitest";
  const state = new GeneratorStateStore();

  try {
    state.start(input.modules);
    state.appendLog("Loading module metadata");

    const mockData = generateMockData(input.modules);
    state.appendLog("Mock data generated");

    const controllerSuites = generateControllerTestSuites(input.modules, mockData, framework);
    state.appendLog(`Controller test suites generated: ${controllerSuites.length}`);

    const serviceSuites = generateServiceTestSuites(input.modules, mockData, framework);
    state.appendLog(`Service test suites generated: ${serviceSuites.length}`);

    const routeSuites = generateRouteTestSuites(input.modules, mockData, framework);
    state.appendLog(`Route test suites generated: ${routeSuites.length}`);

    const integrationSuites = generateIntegrationTestSuites(input.modules, mockData, framework);
    state.appendLog(`Integration test suites generated: ${integrationSuites.length}`);

    const allSuites: TestSuite[] = [
      ...controllerSuites,
      ...serviceSuites,
      ...routeSuites,
      ...integrationSuites,
    ];

    const generatedFiles = allSuites.map((suite) => {
      const assertions = buildAssertions(suite.testCases);
      return {
        path: suite.fileName,
        content: formatTestSuite(suite, assertions),
        suiteType: suite.suiteType,
      };
    });

    const dedupedFiles = ensureUniqueFileNames(generatedFiles, state);
    const coverage = estimateCoverage(input.modules.length, dedupedFiles.length);

    state.setGeneratedTests(dedupedFiles);
    state.setCoverageEstimate(coverage);
    state.markSuccess();

    const snapshot = state.snapshot();
    const output: TestResult = {
      success: true,
      testFiles: snapshot.generatedTests,
      coverage: snapshot.coverageEstimate,
      logs: snapshot.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation failure";
    state.appendError(message);

    const snapshot = state.snapshot();
    const output: TestResult = {
      success: false,
      testFiles: snapshot.generatedTests,
      coverage: snapshot.coverageEstimate,
      logs: snapshot.logs,
      error: snapshot.errors.join("; ") || message,
    };

    return Object.freeze(output);
  }
};

export const generateIntegrationTests = (input: GeneratorInput): Readonly<TestResult> => {
  const framework = input.framework || "vitest";
  const state = new GeneratorStateStore();

  try {
    state.start(input.modules);
    state.appendLog("Generating integration-only tests");

    const mockData = generateMockData(input.modules);
    const integrationSuites = generateIntegrationTestSuites(input.modules, mockData, framework);

    const generatedFiles: GeneratedTestFile[] = integrationSuites.map((suite) => ({
      path: suite.fileName,
      content: formatTestSuite(suite, buildAssertions(suite.testCases)),
      suiteType: "integration",
    }));

    const dedupedFiles = ensureUniqueFileNames(generatedFiles, state);
    const coverage = estimateCoverage(input.modules.length, dedupedFiles.length);

    state.setGeneratedTests(dedupedFiles);
    state.setCoverageEstimate(coverage);
    state.markSuccess();

    const snapshot = state.snapshot();
    return Object.freeze({
      success: true,
      testFiles: snapshot.generatedTests,
      coverage: snapshot.coverageEstimate,
      logs: snapshot.logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown integration generation failure";
    state.appendError(message);

    const snapshot = state.snapshot();
    return Object.freeze({
      success: false,
      testFiles: snapshot.generatedTests,
      coverage: snapshot.coverageEstimate,
      logs: snapshot.logs,
      error: snapshot.errors.join("; ") || message,
    });
  }
};
