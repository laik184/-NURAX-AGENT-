export function buildCacheMatchExpression(requestVar = "request"): string {
  return `caches.match(${requestVar})`;
}
