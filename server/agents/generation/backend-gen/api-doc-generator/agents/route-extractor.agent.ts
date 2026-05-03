import type { ParsedSource } from "../utils/ast-parser.util.js";
import type { HttpMethod, RouteMeta } from "../types.js";

const EXPRESS_ROUTE_PATTERN = /(app|router)\.(get|post|put|patch|delete|options|head)\(['"`]([^'"`]+)['"`],\s*([A-Za-z0-9_$.]+)/g;
const DECORATOR_ROUTE_PATTERN = /@(Get|Post|Put|Patch|Delete|Options|Head)\(['"`]([^'"`]+)['"`]\)/g;
const METHOD_HANDLER_PATTERN = /(?:public\s+|private\s+|protected\s+)?([A-Za-z0-9_]+)\s*\(/;

function extractPathParams(path: string): readonly string[] {
  const params = path.match(/:[A-Za-z0-9_]+/g) ?? [];
  return Object.freeze(params.map((value) => value.slice(1)));
}

function buildTag(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  return segments[Math.max(segments.length - 2, 0)] ?? "api";
}

function toMethod(value: string): HttpMethod {
  return value.toLowerCase() as HttpMethod;
}

export function extractRoutes(parsedSources: readonly ParsedSource[]): readonly RouteMeta[] {
  const routeEntries: RouteMeta[] = [];

  for (const parsed of parsedSources) {
    const text = parsed.sourceText;
    const fileTag = buildTag(parsed.filePath);

    for (const match of text.matchAll(EXPRESS_ROUTE_PATTERN)) {
      const method = toMethod(match[2]);
      const path = match[3];
      const handlerName = match[4].split(".").at(-1) ?? "handler";
      routeEntries.push({
        id: `${method}:${path}:${handlerName}`,
        method,
        path,
        handlerName,
        filePath: parsed.filePath,
        tags: Object.freeze([fileTag]),
        queryParams: Object.freeze([]),
        pathParams: extractPathParams(path),
      });
    }

    for (const match of text.matchAll(DECORATOR_ROUTE_PATTERN)) {
      const method = toMethod(match[1]);
      const path = match[2];
      const lineStart = text.slice(0, match.index ?? 0).split("\n").length - 1;
      const functionLine = text.split("\n").slice(lineStart + 1, lineStart + 4).join("\n");
      const handlerName = functionLine.match(METHOD_HANDLER_PATTERN)?.[1] ?? "handler";
      routeEntries.push({
        id: `${method}:${path}:${handlerName}`,
        method,
        path,
        handlerName,
        filePath: parsed.filePath,
        tags: Object.freeze([fileTag]),
        queryParams: Object.freeze([]),
        pathParams: extractPathParams(path),
      });
    }
  }

  const deduped = new Map<string, RouteMeta>();
  for (const route of routeEntries) {
    if (!deduped.has(route.id)) {
      deduped.set(route.id, Object.freeze(route));
    }
  }

  return Object.freeze([...deduped.values()]);
}
