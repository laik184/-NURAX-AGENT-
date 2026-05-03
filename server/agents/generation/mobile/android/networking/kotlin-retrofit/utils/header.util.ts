export function mergeHeaders(
  defaultHeaders: Readonly<Record<string, string>> = {},
  requestHeaders: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  return Object.freeze({
    Accept: "application/json",
    "Content-Type": "application/json",
    ...defaultHeaders,
    ...requestHeaders,
  });
}
