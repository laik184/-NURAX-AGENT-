# Backend Test Generator (HVP)

## 1) Test generation flow
1. `orchestrator.ts` receives backend modules.
2. It calls `mock-data-generator.agent.ts` to create req/res/payload fixtures.
3. It calls controller, service, route, and integration agents independently.
4. It calls `assertion-builder.agent.ts` for every test case.
5. It formats suites into executable test files and returns a frozen output.

## 2) File responsibilities
- `orchestrator.ts`: orchestration only, state updates, logging, result composition.
- `types.ts`: shared contracts (`TestCase`, `TestSuite`, `MockData`, `Assertion`, `TestResult`).
- `state.ts`: immutable state store with controlled mutations.
- `agents/*`: single-responsibility generators.
- `utils/*`: helper-only formatting, naming, imports, and templating.

## 3) Import relationships
- L1 (`orchestrator`) → L2 (`agents`) + L0 (`state/types`) + L3 (`utils`)
- L2 (`agents`) → L3 (`utils`) + L0 (`types`)
- L3 (`utils`) → L0 (`types`) only when needed
- No agent-to-agent imports.

Example chain:
`orchestrator -> controller-test agent -> assertion-builder agent -> test-format util`

## 4) Example test output
Generated file content follows Arrange → Act → Assert style:
```ts
it("returns success response for valid request", async () => {
  // Arrange
  const req = { body: { name: "users-entity" } };

  // Act
  const result = await request(app).post("/").send(req.body);

  // Assert
  expect(result).toBeDefined();
});
```
