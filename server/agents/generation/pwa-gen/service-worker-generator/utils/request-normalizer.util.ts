export function buildRequestNormalizationSnippet(urlVar = "url"): string {
  return `const normalizedRequestUrl = ${urlVar}.origin + ${urlVar}.pathname;`;
}
