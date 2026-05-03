# Kotlin Retrofit Networking Module (HVP)

## 1) Networking flow

The orchestrator owns the wiring and executes this deterministic flow:

1. Build and normalize the base URL.
2. Create OkHttp-style interceptors (request, response, optional logging, retry-aware).
3. Build the Retrofit client (timeouts + converter factory).
4. Generate API interface endpoint annotations.
5. Attach auth and default headers.
6. Bind structured error handling and response mapping.
7. Return an immutable output object.

Flow path:

`orchestrator -> retrofit-client agent -> api-interface agent -> interceptor agent -> response-mapper agent`

## 2) Retrofit setup

- `retrofit-client.agent.ts` encapsulates Retrofit-like construction details.
- Converter selection is supported via config (`gson` or `moshi`).
- Timeouts and retry policy are passed through from `RetrofitConfig`.
- Interceptors are attached declaratively so runtime implementation can map directly to OkHttp interceptors in Android.

## 3) File responsibilities

### L1
- `orchestrator.ts`: orchestration only, no business logic.

### L2 agents
- `retrofit-client.agent.ts`: creates Retrofit client shape.
- `api-interface.agent.ts`: defines endpoint signatures/annotations.
- `interceptor.agent.ts`: declares request/response/logging interceptors.
- `auth-header.agent.ts`: injects bearer token.
- `error-handler.agent.ts`: normalizes API/network failures.
- `response-mapper.agent.ts`: maps JSON payload to typed models.

### L3 utils
- `url-builder.util.ts`: normalizes and validates base URLs.
- `header.util.ts`: merges standard and custom headers.
- `logger.util.ts`: creates deterministic logs.
- `error-normalizer.util.ts`: converts unknown errors to `NetworkError`.
- `json-parser.util.ts`: parse/serialize JSON utilities.

### L0
- `types.ts`: type contracts (`ApiEndpoint`, `RetrofitConfig`, `RequestConfig`, `ResponseModel`, `NetworkError`).
- `state.ts`: immutable networking lifecycle state.

## 4) Import relationships

- Downward only:
  - `orchestrator` imports `agents`, `utils`, `state`, and `types`.
  - `agents` import only `types` and `utils`.
  - `utils` import nothing or L0 types only.
- No agent imports another agent.
- No DB/UI/business-logic coupling.

## 5) Example API call

```ts
import { createRetrofitClient } from "./index.js";

const output = createRetrofitClient(
  {
    baseUrl: "api.example.com",
    connectTimeoutMs: 15000,
    readTimeoutMs: 15000,
    writeTimeoutMs: 15000,
    converter: "gson",
    token: "jwt-token",
    enableLogging: true,
    retryPolicy: {
      maxRetries: 2,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      backoffMs: 300,
    },
  },
  [
    { name: "getUsers", method: "GET", path: "users", requiresAuth: true },
    { name: "createUser", method: "POST", path: "users", requiresAuth: true },
  ],
);

if (!output.success) {
  console.error(output.error);
}
```

The returned object follows strict output shape and is frozen for immutability.
