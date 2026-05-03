# Prisma Schema Generator — HVP-Compliant Architecture

## 1. Schema Generation Flow

```
GenerationInput (models, relations, enums, datasource, generator)
         |
         ▼
orchestrator.generateSchema(input, state)
         |
         ├── Step 1: datasource-config.agent
         │     - validate provider (postgresql/mysql/sqlite/sqlserver/mongodb)
         │     - set env var name for DATABASE_URL
         │     - produce: datasource db { ... } block
         │
         ├── Step 2: generator-config.agent
         │     - set prisma-client-js provider (default)
         │     - configure output path, previewFeatures, binaryTargets
         │     - produce: generator client { ... } block
         │
         ├── Step 3: enum-builder.agent
         │     - normalize enum names to PascalCase
         │     - normalize enum values to UPPER_CASE
         │     - produce: enum Status { ACTIVE\n INACTIVE } blocks
         │
         ├── Step 4: model-builder.agent
         │     - normalize model names to PascalCase
         │     - auto-inject @id field (cuid()) if absent
         │     - auto-inject createdAt / updatedAt if absent
         │     - produce: model User { ... } blocks
         │
         ├── Step 5: relation-builder.agent
         │     - resolve one-to-one, one-to-many, many-to-many
         │     - inject @relation fields into both sides of the model pair
         │     - inject foreign key scalar fields (e.g. authorId String)
         │     - updates state.models in place (no duplicate fields)
         │
         ├── Step 6: validation.agent
         │     - check every model has @id
         │     - check no duplicate field names
         │     - check field names match /^[a-zA-Z][a-zA-Z0-9_]*$/
         │     - check all relation references point to real models
         │     - check field types are scalars, models, or enums
         │     - gate: ERROR → FAILED, WARNING → passes
         │
         └── Step 7: assemble (orchestrator)
               - concat: datasource + generator + enums + models
               - join sections with blank lines
               - terminate with newline
               │
               ▼
         GenerationResult { success: true, schema: "...", logs: [...] }
```

---

## 2. File Responsibilities

### L0 — Foundation

| File | Responsibility |
|------|----------------|
| `types.ts` | All TypeScript types: `ModelDefinition`, `FieldDefinition`, `RelationDefinition`, `EnumDefinition`, `PrismaSchema`, `GenerationResult`, state shapes. No logic. |
| `state.ts` | Immutable `SchemaGeneratorState`, `INITIAL_STATE`, `transitionState()`. |

### L1 — Orchestrator

| File | Responsibility |
|------|----------------|
| `orchestrator.ts` | Sequences all 7 steps. Assembles final schema string. Exposes `generateSchema` and `validateSchema`. No formatting or validation logic. |

### L2 — Agents

| File | Responsibility |
|------|----------------|
| `datasource-config.agent.ts` | Validates provider name, resolves defaults, formats `datasource db {}` block. |
| `generator-config.agent.ts` | Resolves generator defaults (prisma-client-js), formats `generator client {}` block. |
| `enum-builder.agent.ts` | Normalizes and formats all `enum` blocks. Validates no empty enums. |
| `model-builder.agent.ts` | Normalizes model names, injects `@id`, `createdAt`, `updatedAt` fields, formats `model` blocks. |
| `relation-builder.agent.ts` | Resolves relation types, injects `@relation` fields and FK scalars into both sides of each model pair. |
| `validation.agent.ts` | Full schema correctness check: id presence, no duplicates, valid field names, valid types, valid relation targets. |

### L3 — Utils

| File | Responsibility |
|------|----------------|
| `schema-formatter.util.ts` | Formats individual Prisma elements: fields, models, enums, datasource, generator blocks. `assembleSchema()` joins sections. |
| `naming.util.ts` | `toPascalCase`, `toCamelCase`, `toSnakeCase`, `pluralize`, FK name builders, junction table names. |
| `relation-mapper.util.ts` | Builds the actual `FieldDefinition[]` arrays for both sides of one-to-one, one-to-many, and many-to-many relations. |
| `logger.util.ts` | Structured log/error strings with ISO timestamp and source label. |

---

## 3. Import Relationships

```
index.ts
  └── orchestrator.ts (L1)
        ├── agents/datasource-config.agent.ts (L2)
        │     └── utils/logger.util.ts, schema-formatter.util.ts (L3)
        ├── agents/generator-config.agent.ts (L2)
        │     └── utils/logger.util.ts, schema-formatter.util.ts (L3)
        ├── agents/enum-builder.agent.ts (L2)
        │     └── utils/logger.util.ts, naming.util.ts, schema-formatter.util.ts (L3)
        ├── agents/model-builder.agent.ts (L2)
        │     └── utils/logger.util.ts, naming.util.ts, schema-formatter.util.ts (L3)
        ├── agents/relation-builder.agent.ts (L2)
        │     └── utils/logger.util.ts, relation-mapper.util.ts (L3)
        ├── agents/validation.agent.ts (L2)
        │     └── utils/logger.util.ts (L3)
        ├── state.ts (L0)
        └── types.ts (L0)
```

**Rules enforced:**
- L1 imports L2, L3, L0 only
- L2 imports L3 and L0 only — zero agent-to-agent imports
- L3 is self-contained — no intra-package imports
- L0 has no imports

---

## 4. Example Schema Output

### Input

```typescript
import { generateSchema, INITIAL_STATE } from "./index.js";

const result = generateSchema(
  {
    datasource: { provider: "postgresql", url: "DATABASE_URL" },
    enums: [
      { name: "Role", values: [{ name: "USER" }, { name: "ADMIN" }] },
      { name: "PostStatus", values: [{ name: "DRAFT" }, { name: "PUBLISHED" }] },
    ],
    models: [
      {
        name: "User",
        fields: [
          { name: "email",     type: "String",     isOptional: false, isList: false, attributes: [{ name: "unique" }] },
          { name: "name",      type: "String",     isOptional: true,  isList: false, attributes: [] },
          { name: "role",      type: "Role",       isOptional: false, isList: false, attributes: [], defaultValue: "USER" },
        ],
        attributes: [],
      },
      {
        name: "Post",
        fields: [
          { name: "title",     type: "String",     isOptional: false, isList: false, attributes: [] },
          { name: "content",   type: "String",     isOptional: true,  isList: false, attributes: [] },
          { name: "status",    type: "PostStatus", isOptional: false, isList: false, attributes: [] },
          { name: "published", type: "Boolean",    isOptional: false, isList: false, attributes: [], defaultValue: "false" },
        ],
        attributes: [],
      },
    ],
    relations: [
      { fromModel: "Post", toModel: "User", type: "one-to-many", onDelete: "Cascade" },
    ],
  },
  INITIAL_STATE,
);
```

### Output: `result.output.schema`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum PostStatus {
  DRAFT
  PUBLISHED
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}

model Post {
  id        String     @id @default(cuid())
  title     String
  content   String?
  status    PostStatus
  published Boolean
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
}
```

---

## 5. Auto-injection Rules

| Injected Field | Condition | Prisma Attribute |
|----------------|-----------|-----------------|
| `id String` | Model has no `@id` field | `@id @default(cuid())` |
| `createdAt DateTime` | Field not present in model | `@default(now())` |
| `updatedAt DateTime` | Field not present in model | `@updatedAt` |

---

## 6. Relation Field Injection

| Relation Type | Owner Side (fromModel) | Reference Side (toModel) |
|---------------|------------------------|--------------------------|
| one-to-one | `toModel?` + FK `String?` @unique + `@relation(...)` | `fromModel?` |
| one-to-many | `toModel` + FK `String` + `@relation(...)` | `fromModel[]` |
| many-to-many | `toModel[]` | `fromModel[]` |
