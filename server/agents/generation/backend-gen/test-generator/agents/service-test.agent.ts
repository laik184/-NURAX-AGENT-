import type { BackendModule, MockData, TestFramework, TestSuite } from "../types";
import { buildTargetImport, buildTestFrameworkImport } from "../utils/import-builder.util";
import { buildTestFileName } from "../utils/naming.util";

export const generateServiceTestSuites = (
  modules: BackendModule[],
  mockData: MockData[],
  framework: TestFramework,
): TestSuite[] =>
  modules.flatMap((module) => {
    const moduleMockData = mockData.find((entry) => entry.moduleName === module.name);

    return (module.services || []).map((serviceName) => ({
      fileName: buildTestFileName(serviceName, "service"),
      target: `${serviceName} service`,
      suiteType: "unit" as const,
      framework,
      imports: [
        buildTestFrameworkImport(framework),
        buildTargetImport(serviceName, `../services/${serviceName}`),
      ],
      mocks: [`const fakePayload = ${JSON.stringify(moduleMockData?.payloadSamples[0] || {}, null, 2)};`],
      testCases: [
        {
          id: `${serviceName}-unit-success`,
          title: "processes business logic for valid payload",
          arrange: ["const payload = fakePayload.input;"],
          act: [`const result = await ${serviceName}(payload as any);`],
          assertionHints: ["result should be defined", "result should match expected output"],
          category: "service",
        },
        {
          id: `${serviceName}-unit-edge-null`,
          title: "throws when payload is missing",
          arrange: ["const payload = null;"],
          act: `await expect(${serviceName}(payload as any)).rejects.toBeDefined();`.split("\n"),
          assertionHints: ["error should be thrown for invalid payload"],
          category: "service",
          edgeCase: true,
        },
      ],
    }));
  });
