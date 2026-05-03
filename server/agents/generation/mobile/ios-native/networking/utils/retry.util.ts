export function buildRetryFunction(): string {
  return [
    "private func withRetry<T>(maxAttempts: Int = 1, operation: () async throws -> T) async throws -> T {",
    "    var attempt = 0",
    "    while true {",
    "        do {",
    "            return try await operation()",
    "        } catch {",
    "            attempt += 1",
    "            if attempt >= maxAttempts {",
    "                throw error",
    "            }",
    "        }",
    "    }",
    "}",
  ].join("\n");
}
