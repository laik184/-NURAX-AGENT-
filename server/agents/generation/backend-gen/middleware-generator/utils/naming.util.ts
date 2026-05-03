import type { MiddlewareConfig } from "../types.js";

function toKebabCase(input: string): string {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function buildMiddlewareName(config: MiddlewareConfig): string {
  if (config.name && config.name.trim().length > 0) {
    return toKebabCase(config.name);
  }

  return `${config.framework}-${config.type}-middleware`;
}
