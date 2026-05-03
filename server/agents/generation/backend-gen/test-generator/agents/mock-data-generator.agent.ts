import type { BackendModule, MockData } from "../types";

export const generateMockData = (modules: BackendModule[]): MockData[] =>
  modules.map((module) => ({
    moduleName: module.name,
    requestSamples: [
      {
        params: { id: "sample-id" },
        query: { page: "1" },
        body: { name: `${module.name}-entity` },
      },
    ],
    responseSamples: [
      {
        statusCode: 200,
        body: { success: true, module: module.name },
      },
      {
        statusCode: 400,
        body: { success: false, error: "Validation failed" },
      },
    ],
    payloadSamples: [
      {
        input: { id: "sample-id" },
        output: { id: "sample-id", processed: true },
      },
    ],
  }));
