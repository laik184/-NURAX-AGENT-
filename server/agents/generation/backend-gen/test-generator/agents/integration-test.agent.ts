import type { BackendModule, MockData, TestFramework, TestSuite } from "../types";
import { buildTargetImport, buildTestFrameworkImport } from "../utils/import-builder.util";
import { buildTestFileName } from "../utils/naming.util";

export const generateIntegrationTestSuites = (
  modules: BackendModule[],
  mockData: MockData[],
  framework: TestFramework,
): TestSuite[] =>
  modules.map((module) => {
    const moduleMockData = mockData.find((entry) => entry.moduleName === module.name);

    return {
      fileName: buildTestFileName(module.name, "integration"),
      target: `${module.name} integration flow`,
      suiteType: "integration" as const,
      framework,
      imports: [
        buildTestFrameworkImport(framework),
        buildTargetImport("app", `../${module.name}/app`),
        `import request from "supertest";`,
      ],
      mocks: [`const payload = ${JSON.stringify(moduleMockData?.requestSamples[0] || {}, null, 2)};`],
      testCases: [
        {
          id: `${module.name}-integration-happy-path`,
          title: "completes a full request-to-response flow",
          arrange: ["const endpoint = '/';"],
          act: ["const result = await request(app).post(endpoint).send(payload.body);"],
          assertionHints: ["status should be successful", "response should contain success true"],
          category: "integration",
        },
        {
          id: `${module.name}-integration-invalid-payload`,
          title: "returns validation error for invalid payload",
          arrange: ["const endpoint = '/';", "const invalidPayload = {};"],
          act: ["const result = await request(app).post(endpoint).send(invalidPayload);"],
          assertionHints: ["status should be 400", "error payload should be returned"],
          category: "integration",
          edgeCase: true,
        },
      ],
    };
  });
