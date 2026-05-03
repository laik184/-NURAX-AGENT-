# API Doc Generator (HVP Compliant)

## 1) API doc generation flow
`orchestrator.ts` runs the full pipeline in strict order:
1. scan project files
2. route extraction
3. schema extraction
4. request doc build
5. response doc build
6. example generation
7. OpenAPI document build
8. frozen output return

## 2) File responsibilities
- `types.ts`: canonical contracts (`RouteMeta`, `SchemaMeta`, `RequestDoc`, `ResponseDoc`, `OpenAPISpec`).
- `state.ts`: immutable pipeline state model and initial state.
- `orchestrator.ts`: process coordinator and the only state mutation boundary.
- `index.ts`: public API export surface.
- `agents/*`: single-responsibility document generation units.
- `utils/*`: parser/mapper/json/logging helpers only.

## 3) Import relationships
Allowed import graph:
- L1 `orchestrator` -> L2 `agents`
- L1/L2 -> L3 `utils`
- L1/L2/L3 -> L0 `types`, `state`

Forbidden:
- agent -> agent imports
- upward imports

## 4) Example OpenAPI output
```json
{
  "success": true,
  "openapi": {
    "openapi": "3.0.3",
    "info": {
      "title": "Generated API",
      "version": "1.0.0",
      "description": "Auto-generated OpenAPI documentation"
    },
    "paths": {
      "/users": {
        "get": {
          "operationId": "listUsers",
          "responses": {
            "200": { "description": "Success" }
          }
        }
      }
    },
    "components": { "schemas": {} },
    "tags": []
  },
  "logs": []
}
```

## 5) Usage guide
```ts
import { generateApiDocs, getOpenAPISpec } from "./index.js";

const result = await generateApiDocs({ rootDir: "./server" });
if (result.success) {
  console.log(result.openapi);
}

console.log(getOpenAPISpec());
```
