# controller-generator

## 1) Controller generation flow

`generateController(config)` in `orchestrator.ts` executes a strict pipeline:

1. route mapping (`route-mapper.agent.ts`)
2. request parsing (`request-parser.agent.ts`)
3. validation injection (`validation-injector.agent.ts`)
4. method response build (`response-builder.agent.ts`)
5. error wrapping (`error-handler.agent.ts`)
6. controller source assembly (`controller-builder.agent.ts`)
7. immutable output freeze (`Object.freeze(output)`)

This keeps business logic out of controllers and enforces thin request/response orchestration only.

## 2) File responsibilities

- `orchestrator.ts`: coordinates generation pipeline and state transitions.
- `types.ts`: shared contracts (`ControllerConfig`, `RouteDefinition`, `MethodDefinition`, `ValidationSchema`, `GeneratedController`).
- `state.ts`: immutable state store and controlled transition logging.
- `agents/controller-builder.agent.ts`: generates complete controller class source.
- `agents/route-mapper.agent.ts`: normalizes HTTP route definitions.
- `agents/request-parser.agent.ts`: produces request extraction snippets.
- `agents/response-builder.agent.ts`: creates response/return snippets.
- `agents/validation-injector.agent.ts`: binds validation metadata to methods.
- `agents/error-handler.agent.ts`: wraps method body with try/catch handling.
- `utils/template-loader.util.ts`: minimal template header/footer selection.
- `utils/code-formatter.util.ts`: formatting helpers.
- `utils/naming.util.ts`: naming conversions and file naming.
- `utils/import-builder.util.ts`: import and service interface assembly.
- `index.ts`: exports `generateController()` and public types.

## 3) Import relationships

- L1 (`orchestrator.ts`) imports L2 agents + L0 state/types + L3 util naming.
- L2 agents import only L3 utils and L0 types.
- L3 utils are dependency-leaf helpers.
- No agent imports another agent.

Diagram:

- `orchestrator.ts -> agents/*`
- `orchestrator.ts -> state.ts`
- `orchestrator.ts -> types.ts`
- `agents/* -> utils/*`
- `agents/* -> types.ts`
- `index.ts -> orchestrator.ts`

## 4) Example controller output

Generated controller methods follow:

`req -> validate metadata lookup -> service call -> standardized JSON response`

Example emitted method shape:

```ts
public async getUser(req: Request, res: Response): Promise<Response> {
  try {
    const params = req.params as Record<string, string>;
    const servicePayload = { params: req.params, query: req.query, body: req.body };
    const result = await this.service.getUser(servicePayload);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled controller error";
    return res.status(500).json({ success: false, error: message });
  }
}
```
