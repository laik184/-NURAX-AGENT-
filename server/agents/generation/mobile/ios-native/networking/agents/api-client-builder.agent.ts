import type { APIClient, EndpointConfig } from "../types.js";
import { buildRetryFunction } from "../utils/retry.util.js";

export function buildApiClient(
  endpoints: readonly EndpointConfig[],
  config: Readonly<APIClient> | undefined,
  hasAuthToken: boolean,
): string {
  const className = config?.className ?? "APIClient";
  const endpointMethods = endpoints
    .map((endpoint) => {
      const methodArgs = endpoint.requestBodyType ? `body: ${endpoint.requestBodyType}? = nil` : "";
      const encodeBodyLine = endpoint.requestBodyType
        ? "let bodyData = try body.map { try JSONEncoder().encode($0) }"
        : "let bodyData: Data? = nil";

      return [
        `    func ${endpoint.name}(${methodArgs}) async throws -> ${endpoint.responseType} {`,
        `        ${encodeBodyLine}`,
        `        let request = try requestBuilder.build(endpoint: .${endpoint.name}, body: bodyData)`,
        "        let (data, response) = try await execute(request)",
        "        guard let httpResponse = response as? HTTPURLResponse else {",
        "            throw NetworkError.unknown",
        "        }",
        "        guard (200...299).contains(httpResponse.statusCode) else {",
        "            throw NetworkError.httpError(statusCode: httpResponse.statusCode, payload: data)",
        "        }",
        `        return try responseParser.decode(${endpoint.responseType}.self, from: data)`,
        "    }",
      ].join("\n");
    })
    .join("\n\n");

  const authTokenProperty = hasAuthToken ? "    private let authToken: String\n" : "";
  const authTokenInitArg = hasAuthToken ? "authToken: String, " : "";
  const authTokenAssignment = hasAuthToken ? "        self.authToken = authToken\n" : "";
  const authTokenRequestBuilderArg = hasAuthToken ? "authToken: authToken" : "authToken: nil";

  return [
    "import Foundation",
    "",
    `final class ${className} {`,
    authTokenProperty + "    private let session: URLSession",
    "    private let requestBuilder: RequestBuilder",
    "    private let responseParser = ResponseParser()",
    "",
    `    init(baseURL: String, ${authTokenInitArg}session: URLSession = .shared, defaultHeaders: [String: String] = [:], tokenProvider: @escaping () -> String? = { nil }) {`,
    "        self.session = session",
    authTokenAssignment + `        self.requestBuilder = RequestBuilder(baseURL: baseURL, defaultHeaders: defaultHeaders, ${authTokenRequestBuilderArg}, tokenProvider: tokenProvider)`,
    "    }",
    "",
    endpointMethods,
    "",
    "    private func execute(_ request: URLRequest) async throws -> (Data, URLResponse) {",
    "        do {",
    "            return try await withRetry(maxAttempts: 2) {",
    "                try await session.data(for: request)",
    "            }",
    "        } catch {",
    "            throw NetworkError.networkFailure(error)",
    "        }",
    "    }",
    "",
    `    ${buildRetryFunction().replace(/\n/g, "\n    ")}`,
    "}",
  ]
    .join("\n")
    .replace(/\n\n\n+/g, "\n\n");
}
