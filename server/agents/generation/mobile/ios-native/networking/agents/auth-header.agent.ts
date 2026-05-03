import type { EndpointConfig } from "../types.js";

export function buildAuthHeaderInjection(
  endpoint: Readonly<EndpointConfig>,
  hasGlobalToken: boolean,
): string {
  if (!endpoint.requiresAuth) {
    return "";
  }

  if (!hasGlobalToken) {
    return [
      "if let token = tokenProvider() {",
      "    request.setValue(\"Bearer \\(token)\", forHTTPHeaderField: \"Authorization\")",
      "}",
    ].join("\n");
  }

  return [
    "if let authToken = authToken {",
    "    request.setValue(\"Bearer \\(authToken)\", forHTTPHeaderField: \"Authorization\")",
    "}",
  ].join("\n");
}
