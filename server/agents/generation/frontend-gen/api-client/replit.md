# API Client Generator (HVP)

## 1) Module Purpose
This module generates reusable frontend API service files from API schemas/endpoints. It enforces layered HVP boundaries and returns immutable, standardized generation output.

## 2) File Responsibilities
- `orchestrator.ts` (L1): Coordinates the flow only; updates immutable state through controlled transitions.
- `agents/api-client-generator.agent.ts` (L2): Builds the final API client source file.
- `agents/endpoint-parser.agent.ts` (L2): Parses OpenAPI-like schemas into endpoint metadata.
- `agents/request-builder.agent.ts` (L2): Builds API request objects and request templates.
- `agents/response-handler.agent.ts` (L2): Defines response normalization helpers.
- `agents/auth-header.agent.ts` (L2): Attaches auth header details to requests.
- `agents/error-handler.agent.ts` (L2): Normalizes errors and log-safe messages.
- `utils/template-builder.util.ts` (L3): Creates fetch/axios endpoint function templates.
- `utils/http-client.util.ts` (L3): Produces client import/instance snippets.
- `utils/naming.util.ts` (L3): Generates consistent function names.
- `utils/file-format.util.ts` (L3): Formats generated file output.
- `utils/logger.util.ts` (L3): Creates standardized log lines.
- `types.ts` (L0): Shared contracts (`Endpoint`, `ApiRequest`, `ApiResponse`, `ClientConfig`, `GenerationResult`, etc).
- `state.ts` (L0): Immutable state seed and transition helper.
- `index.ts`: Public export surface (`generateApiClient`).

## 3) Generation Flow
1. Orchestrator receives schema + config.
2. Endpoint parser extracts endpoints.
3. Request builder builds request templates.
4. Auth header agent augments secure requests.
5. API client generator creates source text.
6. Formatter normalizes output.
7. Orchestrator returns immutable result object.

Flow shorthand: `orchestrator -> parser -> builder -> generator -> output`

## 4) Import Relationships
- Allowed: `orchestrator -> agents`
- Allowed: `agents -> utils`
- Allowed: `L0 shared by L1/L2/L3`
- Forbidden: `agent -> agent`

## 5) Example Output
```ts
export const getUsers = async (params: Record<string, string>) => {
  const response = await api.request({
    url: `/users`,
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return response;
};
```
