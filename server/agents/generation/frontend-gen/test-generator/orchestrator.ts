import path from "node:path";
import { generateApiTests } from "./agents/api-test.agent.js";
import { generateComponentTests } from "./agents/component-test.agent.js";
import { analyzeCoverage } from "./agents/coverage-analyzer.agent.js";
import { generateFormTests } from "./agents/form-test.agent.js";
import { generateInteractionTests } from "./agents/interaction-test.agent.js";
import { generatePageTests } from "./agents/page-test.agent.js";
import {
  getOrchestratorActorToken,
  mutateFrontendTestGeneratorState,
  resetFrontendTestGeneratorState,
} from "./state.js";
import type { GenerateTestInput, GeneratedTestArtifacts, TestResult, TestSuite, TestType } from "./types.js";
import { detectTestType, parseComponentMeta } from "./utils/ast-parser.util.js";
import { buildFrameworkImports } from "./utils/assertion-builder.util.js";
import { writeGeneratedTestFile } from "./utils/file-writer.util.js";
import { buildTestTemplate } from "./utils/test-template.util.js";

function buildSuite(input: GenerateTestInput, testType: TestType): GeneratedTestArtifacts {
  const meta = parseComponentMeta(input);

  const testCases =
    testType === "form"
      ? generateFormTests(meta)
      : testType === "page"
        ? generatePageTests(meta)
        : testType === "api"
          ? generateApiTests(meta)
          : testType === "interaction"
            ? generateInteractionTests(meta)
            : generateComponentTests(meta);

  const suite: TestSuite = Object.freeze({
    suiteName: `${meta.name} ${testType} tests`,
    testType,
    framework: meta.framework,
    imports: Object.freeze([
      ...buildFrameworkImports(meta.framework),
      `import ${meta.name} from '${meta.sourcePath}';`,
    ]),
    testCases,
  });

  const testContent = buildTestTemplate(suite);
  const suggestedFileName = `${path.basename(input.targetFile, path.extname(input.targetFile))}.${testType}.spec.tsx`;

  return Object.freeze({
    suite,
    testContent,
    suggestedFileName,
  });
}

export function generateFrontendTest(input: GenerateTestInput): Readonly<TestResult> {
  const actor = getOrchestratorActorToken();
  const logs: string[] = [];

  resetFrontendTestGeneratorState(actor);

  try {
    mutateFrontendTestGeneratorState(actor, {
      targetFile: input.targetFile,
      testType: "component",
      generatedTests: Object.freeze([]),
      coverage: 0,
      status: "GENERATING",
      logs: Object.freeze([]),
      errors: Object.freeze([]),
    });

    logs.push(`received target: ${input.targetFile}`);
    const testType = detectTestType(input);
    logs.push(`detected test type: ${testType}`);

    const artifacts = buildSuite(input, testType);
    logs.push(`built ${artifacts.suite.testCases.length} test cases`);

    const coverageReport = analyzeCoverage(testType, artifacts.suite.testCases);
    logs.push(`estimated coverage: ${coverageReport.coverage}%`);

    const outputDir = input.outputDir ?? path.join(process.cwd(), "generated-tests");
    const testFilePath = writeGeneratedTestFile(outputDir, artifacts.suggestedFileName, artifacts.testContent);
    logs.push(`wrote test file: ${testFilePath}`);

    mutateFrontendTestGeneratorState(actor, {
      targetFile: input.targetFile,
      testType,
      generatedTests: Object.freeze(artifacts.suite.testCases.map((testCase) => testCase.title)),
      coverage: coverageReport.coverage,
      status: "SUCCESS",
      logs: Object.freeze([...logs]),
      errors: Object.freeze([]),
    });

    return Object.freeze({
      success: true,
      testFilePath,
      coverage: coverageReport.coverage,
      logs: Object.freeze([...logs]),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    logs.push(`generation failed: ${message}`);

    mutateFrontendTestGeneratorState(actor, {
      status: "FAILED",
      logs: Object.freeze([...logs]),
      errors: Object.freeze([message]),
    });

    return Object.freeze({
      success: false,
      testFilePath: "",
      coverage: 0,
      logs: Object.freeze([...logs]),
      error: message,
    });
  }
}
