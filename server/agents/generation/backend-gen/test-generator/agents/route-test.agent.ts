import type { BackendModule, MockData, TestFramework, TestSuite } from "../types";
import { buildTargetImport, buildTestFrameworkImport } from "../utils/import-builder.util";
import { buildTestFileName } from "../utils/naming.util";

export const generateRouteTestSuites = (
  modules: BackendModule[],
  mockData: MockData[],
  framework: TestFramework,
): TestSuite[] =>
  modules.flatMap((module) => {
    const moduleMockData = mockData.find((entry) => entry.moduleName === module.name);

    return (module.routes || []).map((routeName) => ({
      fileName: buildTestFileName(routeName, "route"),
      target: `${routeName} route`,
      suiteType: "unit" as const,
      framework,
      imports: [buildTestFrameworkImport(framework), buildTargetImport(routeName, `../routes/${routeName}`)],
      mocks: [
        `const req = ${JSON.stringify(moduleMockData?.requestSamples[0] || {}, null, 2)};`,
        "const res = { statusCode: 0, body: null as unknown };",
      ],
      testCases: [
        {
          id: `${routeName}-route-contract`,
          title: "returns valid status and response body",
          arrange: ["const app = routeName;"],
          act: ["const response = { status: 200, body: { success: true } };"],
          assertionHints: ["route should return 2xx status", "response should contain expected body"],
          category: "route",
        },
        {
          id: `${routeName}-route-not-found`,
          title: "returns not found for unsupported path",
          arrange: ["const invalidPath = '/unknown';"],
          act: ["const response = { status: 404, body: { error: 'Not found' } };"],
          assertionHints: ["route should return 404 for unknown endpoints"],
          category: "route",
          edgeCase: true,
        },
      ],
    }));
  });
