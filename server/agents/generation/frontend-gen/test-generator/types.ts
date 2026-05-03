export type SupportedFramework = "react" | "next" | "vue";

export type TestType = "component" | "page" | "form" | "api" | "interaction";

export interface ComponentMeta {
  readonly name: string;
  readonly framework: SupportedFramework;
  readonly sourcePath: string;
  readonly sourceCode: string;
  readonly hasForm: boolean;
  readonly hasApiCalls: boolean;
  readonly hasNavigation: boolean;
}

export interface TestCase {
  readonly id: string;
  readonly title: string;
  readonly arrange: string;
  readonly act: string;
  readonly assert: string;
  readonly tags: readonly string[];
}

export interface TestSuite {
  readonly suiteName: string;
  readonly testType: TestType;
  readonly framework: SupportedFramework;
  readonly imports: readonly string[];
  readonly testCases: readonly TestCase[];
}

export interface CoverageReport {
  readonly coverage: number;
  readonly coveredAreas: readonly string[];
  readonly missingAreas: readonly string[];
}

export interface TestResult {
  readonly success: boolean;
  readonly testFilePath: string;
  readonly coverage: number;
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface GenerateTestInput {
  readonly targetFile: string;
  readonly sourceCode: string;
  readonly framework: SupportedFramework;
  readonly preferredTestType?: Exclude<TestType, "interaction">;
  readonly outputDir?: string;
}

export interface GeneratedTestArtifacts {
  readonly suite: TestSuite;
  readonly testContent: string;
  readonly suggestedFileName: string;
}
