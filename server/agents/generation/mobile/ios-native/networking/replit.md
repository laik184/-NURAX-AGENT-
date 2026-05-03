# iOS Native Networking Generator (HVP)

## Networking flow

1. `orchestrator.ts` receives API configuration and validates it.
2. `endpoint-mapper.agent.ts` builds the `Endpoints.swift` enum.
3. `request-builder.agent.ts` builds `URLRequest` creation logic and injects headers/auth.
4. `api-client-builder.agent.ts` builds the async/await `APIClient.swift` wrapper around `URLSession`.
5. `response-parser.agent.ts` builds Codable decoding via `JSONDecoder`.
6. `error-handler.agent.ts` builds `NetworkError.swift` to normalize HTTP/network/decoding errors.
7. Orchestrator returns frozen output with generated files, logs, and error metadata.

## File responsibilities

- `orchestrator.ts` (L1): pipeline orchestration only, no business/domain logic.
- `agents/*` (L2): one concern per generator agent.
  - `api-client-builder`: async/await API client methods.
  - `request-builder`: URLRequest assembly (method/headers/body).
  - `response-parser`: Codable decode helper.
  - `error-handler`: NetworkError enum generation.
  - `auth-header`: bearer token header injection.
  - `endpoint-mapper`: endpoint enum mapping.
- `utils/*` (L3): formatting/helper utilities only.
- `types.ts` and `state.ts` (L0): contracts and orchestration state model.

## Import structure

- Downward-only imports are enforced:
  - L1 imports L2/L3/L0.
  - L2 imports L3/L0.
  - L3 imports none or local primitive helpers.
- Agents do not import other agents directly; auth header snippets are composed in `orchestrator.ts` and injected into request generation.
- No UI/ViewModel/CoreData coupling.

## Swift code generation flow

`orchestrator -> endpoint-mapper -> request-builder -> api-client-builder -> response-parser -> error-handler`

Generated Swift files:

- `APIClient.swift`
- `Endpoints.swift`
- `NetworkError.swift`
- `RequestBuilder.swift`
- `ResponseParser.swift`

Generated code is production-oriented with:

- `URLSession` async/await
- `Codable` parsing support
- clear error mapping
- auth header support
- retry wrapper for transient failures
