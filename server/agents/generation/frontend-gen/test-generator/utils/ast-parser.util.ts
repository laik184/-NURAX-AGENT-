import path from "node:path";
import type { ComponentMeta, GenerateTestInput, TestType } from "../types.js";

function hasPattern(sourceCode: string, pattern: RegExp): boolean {
  return pattern.test(sourceCode);
}

function normalizeName(targetFile: string): string {
  const baseName = path.basename(targetFile, path.extname(targetFile));
  return baseName || "AnonymousComponent";
}

function detectType(input: GenerateTestInput, meta: ComponentMeta): TestType {
  if (input.preferredTestType) {
    return input.preferredTestType;
  }

  if (meta.hasForm) {
    return "form";
  }

  if (meta.hasApiCalls) {
    return "api";
  }

  if (meta.hasNavigation) {
    return "page";
  }

  return "component";
}

export function parseComponentMeta(input: GenerateTestInput): Readonly<ComponentMeta> {
  const sourceCode = input.sourceCode;

  return Object.freeze({
    name: normalizeName(input.targetFile),
    framework: input.framework,
    sourcePath: input.targetFile,
    sourceCode,
    hasForm: hasPattern(sourceCode, /<form|useForm|v-model|onSubmit|handleSubmit/),
    hasApiCalls: hasPattern(sourceCode, /fetch\(|axios\.|useQuery|useMutation|\$fetch/),
    hasNavigation: hasPattern(sourceCode, /router|navigate\(|next\/navigation|<Link|<a /),
  });
}

export function detectTestType(input: GenerateTestInput): TestType {
  return detectType(input, parseComponentMeta(input));
}
