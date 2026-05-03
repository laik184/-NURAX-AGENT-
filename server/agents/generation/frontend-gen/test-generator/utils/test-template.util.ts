import type { TestSuite } from "../types.js";

function indent(block: string, spaces = 4): string {
  const pad = " ".repeat(spaces);
  return block
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

export function buildTestTemplate(suite: TestSuite): string {
  const imports = suite.imports.join("\n");
  const body = suite.testCases
    .map((testCase) => {
      const steps = [testCase.arrange, testCase.act, testCase.assert].filter(Boolean).join("\n");
      return `it('${testCase.title}', async () => {\n${indent(steps)}\n});`;
    })
    .join("\n\n");

  return `${imports}\n\ndescribe('${suite.suiteName}', () => {\n${indent(body)}\n});\n`;
}
