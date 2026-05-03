import { ROUTE_PARAM_REGEX } from "./nav-constants.util.js";

export interface ParsedRoute {
  readonly normalizedPath: string;
  readonly params: readonly string[];
}

export function parseRoutePath(path: string): ParsedRoute {
  const normalizedPath = path.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const params = new Set<string>();

  for (const match of normalizedPath.matchAll(ROUTE_PARAM_REGEX)) {
    if (match[1]) {
      params.add(match[1]);
    }
  }

  return Object.freeze({
    normalizedPath,
    params: Object.freeze([...params]),
  });
}
