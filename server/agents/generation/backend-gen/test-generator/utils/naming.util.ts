export const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

export const buildTestFileName = (target: string, suite: "controller" | "service" | "route" | "integration"): string =>
  `${toKebabCase(target)}.${suite}.spec.ts`;
