import type { EndpointConfig } from "../types.js";
import { toSwiftHeaderDictionary } from "../utils/header.util.js";

export function buildRequestBuilder(
  endpoints: readonly EndpointConfig[],
  headers: Readonly<Record<string, string>>,
  authInjectors: Readonly<Record<string, string>>,
): string {
  const defaultHeaders = toSwiftHeaderDictionary(headers);
  const endpointCases = endpoints
    .map((endpoint) => {
      const authInjection = authInjectors[endpoint.name] ?? "";
      return [
        `        case .${endpoint.name}:`,
        `            request.httpMethod = \"${endpoint.method}\"`,
        authInjection ? `            ${authInjection.replace(/\n/g, "\n            ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    "import Foundation",
    "",
    "struct RequestBuilder {",
    "    let baseURL: String",
    "    let defaultHeaders: [String: String]",
    "    let authToken: String?",
    "    let tokenProvider: () -> String?",
    "",
    "    func build(endpoint: APIEndpoint, body: Data? = nil) throws -> URLRequest {",
    "        guard let url = URL(string: baseURL + endpoint.path) else {",
    "            throw NetworkError.invalidURL",
    "        }",
    "",
    "        var request = URLRequest(url: url)",
    "        defaultHeaders.forEach { key, value in",
    "            request.setValue(value, forHTTPHeaderField: key)",
    "        }",
    "",
    "        switch endpoint {",
    endpointCases,
    "        }",
    "",
    "        request.httpBody = body",
    "        return request",
    "    }",
    "}",
    "",
    `// Default header template: ${defaultHeaders}`,
  ].join("\n");
}
