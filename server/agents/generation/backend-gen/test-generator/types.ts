export type TestFramework = "jest" | "vitest";

export interface BackendModule {
  name: string;
  controllers?: string[];
  services?: string[];
  routes?: string[];
  dependencies?: string[];
}

export interface TestCase {
  id: string;
  title: string;
  arrange: string[];
  act: string[];
  assertionHints: string[];
  category: "controller" | "service" | "route" | "integration";
  edgeCase?: boolean;
}

export interface TestSuite {
  fileName: string;
  target: string;
  suiteType: "unit" | "integration";
  framework: TestFramework;
  imports: string[];
  mocks: string[];
  testCases: TestCase[];
}

export interface MockData {
  moduleName: string;
  requestSamples: Record<string, unknown>[];
  responseSamples: Record<string, unknown>[];
  payloadSamples: Record<string, unknown>[];
}

export interface Assertion {
  testCaseId: string;
  description: string;
  expression: string;
}

export interface GeneratedTestFile {
  path: string;
  content: string;
  suiteType: "unit" | "integration";
}

export interface TestResult {
  success: boolean;
  testFiles: GeneratedTestFile[];
  coverage: number;
  logs: string[];
  error?: string;
}

export interface GeneratorInput {
  modules: BackendModule[];
  framework?: TestFramework;
}
