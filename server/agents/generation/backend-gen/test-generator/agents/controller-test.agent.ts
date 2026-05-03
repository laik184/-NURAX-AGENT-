import type { BackendModule, MockData, TestFramework, TestSuite } from "../types";
import { buildTargetImport, buildTestFrameworkImport } from "../utils/import-builder.util";
import { buildTestFileName } from "../utils/naming.util";

export const generateControllerTestSuites = (
  modules: BackendModule[],
  mockData: MockData[],
  framework: TestFramework,
): TestSuite[] =>
  modules.flatMap((module) => {
    const moduleMockData = mockData.find((entry) => entry.moduleName === module.name);

    return (module.controllers || []).map((controllerName) => ({
      fileName: buildTestFileName(controllerName, "controller"),
      target: `${controllerName} controller`,
      suiteType: "unit" as const,
      framework,
      imports: [
        buildTestFrameworkImport(framework),
        buildTargetImport(controllerName, `../controllers/${controllerName}`),
      ],
      mocks: [
        `const req = ${JSON.stringify(moduleMockData?.requestSamples[0] || {}, null, 2)};`,
        `const res = { status: ${framework === "vitest" ? "vi.fn" : "jest.fn"}().mockReturnThis(), json: ${framework === "vitest" ? "vi.fn" : "jest.fn"}() };`,
      ],
      testCases: [
        {
          id: `${controllerName}-controller-success`,
          title: "returns success response for valid request",
          arrange: ["const next = vi.fn?.() ?? jest.fn();"],
          act: [`await ${controllerName}(req as any, res as any, next as any);`],
          assertionHints: ["status 200 should be returned", "response payload should include success"],
          category: "controller",
        },
        {
          id: `${controllerName}-controller-validation-error`,
          title: "handles invalid request payload",
          arrange: ["(req as any).body = {};", "const next = vi.fn?.() ?? jest.fn();"],
          act: [`await ${controllerName}(req as any, res as any, next as any);`],
          assertionHints: ["status 400 should be returned for invalid input"],
          category: "controller",
          edgeCase: true,
        },
      ],
    }));
  });
