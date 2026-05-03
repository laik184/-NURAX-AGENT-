# Model Generator (HVP Compliant)

## 1) Model generation flow

`orchestrator -> schema-parser -> relation-mapper -> constraint-builder -> index-builder -> model-builder -> orm-adapter`

The orchestrator performs the full linear pipeline and writes immutable state transitions through `state.ts`.

## 2) File responsibilities

- `types.ts` (L0): shared contracts for schema inputs, constraints, relations, outputs, and state.
- `state.ts` (L0): immutable state container and transition APIs.
- `orchestrator.ts` (L1): execution order and lifecycle logging.
- `agents/*.agent.ts` (L2): single-purpose transformation units.
- `utils/*.util.ts` (L3): helper functions only (naming, type mapping, formatting, normalization, template loading).
- `templates/*.tpl.ts`: static ORM wrappers with dynamic injection points.
- `index.ts`: public entrypoints.

## 3) Import relationships

- L1 imports L2 and L0.
- L2 imports L3 and L0.
- L3 imports templates/types only where required.
- No agent-to-agent imports.

## 4) ORM support

Supported ORMs:
- Prisma
- Sequelize
- TypeORM
- Mongoose

Use `getSupportedORMs()` from `index.ts` for runtime discovery.

## 5) Example input/output

### Input

```ts
{
  name: "User",
  fields: [
    { name: "id", type: "uuid", primary: true },
    { name: "email", type: "string", unique: true, required: true },
    { name: "createdAt", type: "date" }
  ],
  relations: [],
  indexes: []
}
```

### Output

```ts
{
  success: true,
  modelName: "User",
  code: "...orm specific model code...",
  orm: "prisma",
  logs: ["Received schema input.", "Schema parser completed.", "..."]
}
```

The output object is always frozen before return.
