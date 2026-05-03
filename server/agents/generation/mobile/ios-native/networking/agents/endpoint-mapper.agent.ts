import type { EndpointConfig } from "../types.js";
import { normalizePath } from "../utils/url-builder.util.js";

export function mapEndpoints(endpoints: readonly EndpointConfig[]): string {
  const body = endpoints
    .map((endpoint) => {
      const query = endpoint.queryParams?.length ? endpoint.queryParams.join(", ") : "none";
      return [
        `    case ${endpoint.name}`,
        "",
        "    var path: String {",
        "        switch self {",
        `        case .${endpoint.name}: return \"${normalizePath(endpoint.path)}\"`,
        "        }",
        "    }",
        "",
        "    var method: String {",
        "        switch self {",
        `        case .${endpoint.name}: return \"${endpoint.method}\"`,
        "        }",
        "    }",
        "",
        "    // query params: " + query,
      ].join("\n");
    })
    .join("\n\n");

  return [
    "import Foundation",
    "",
    "enum APIEndpoint {",
    body,
    "}",
  ].join("\n");
}
