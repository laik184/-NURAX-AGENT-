# Mongoose Schema Generator — HVP-Compliant Architecture

## 1. Schema Generation Flow

```
SchemaConfig (name, fields, relations, indexes, timestamps, ...)
         |
         ▼
orchestrator.generateSchema(config, state)
         |
         ├── Step 1: field-mapper.agent
         │     - map input types → Mongoose types (String, Number, Date, ObjectId, ...)
         │     - render field body with validation rules inline
         │     - produce: MappedField[] with schemaLine per field
         │
         ├── Step 2: relation-mapper.agent
         │     - resolve ObjectId + ref for every RelationDefinition
         │     - wrap in array for one-to-many / many-to-many
         │     - produce: MappedRelation[] with populatePath per relation
         │
         ├── Step 3: validation-builder.agent
         │     - validate field name patterns /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
         │     - check enum arrays are non-empty
         │     - check min ≤ max, minLength ≤ maxLength
         │     - warn on ObjectId fields without ref
         │     - gate: ERROR → FAILED
         │
         ├── Step 4: index-builder.agent
         │     - infer indexes from unique field flags
         │     - merge with explicit IndexConfig[]
         │     - deduplicate by field key
         │     - produce: IndexConfig[] + schemaVar.index(...) lines
         │
         ├── Step 5: schema-optimizer.agent
         │     - deduplicate fields by name
         │     - merge redundant indexes by field signature
         │     - produce suggestions (timestamps, maxlength, ref indexing)
         │
         └── Step 6: schema-builder.agent
               - assemble import block
               - render schema body (field lines + relation lines)
               - build schema options (timestamps, strict, versionKey, collection)
               - append index calls
               - emit model export
               │
               ▼
         SchemaResult { success: true, schema: "...", indexes: [...], logs: [...] }
```

---

## 2. File Responsibilities

### L0 — Foundation

| File | Responsibility |
|------|----------------|
| `types.ts` | All TypeScript types: `FieldDefinition`, `RelationDefinition`, `SchemaConfig`, `IndexConfig`, `SchemaResult`, state shapes. No logic. |
| `state.ts` | Immutable `MongooseSchemaState`, `INITIAL_STATE`, `transitionState()`. |

### L1 — Orchestrator

| File | Responsibility |
|------|----------------|
| `orchestrator.ts` | Sequences all 6 steps in order. Exposes `generateSchema`, `validateSchema`, `optimizeSchema`. No formatting or domain logic. |

### L2 — Agents

| File | Responsibility |
|------|----------------|
| `field-mapper.agent.ts` | Maps input field types to Mongoose type strings. Renders per-field schema body including validation rules, defaults, enums. |
| `relation-mapper.agent.ts` | Resolves `RelationDefinition[]` to `{ type: Schema.Types.ObjectId, ref: "..." }` entries. Wraps arrays for to-many relations. |
| `validation-builder.agent.ts` | Validates field names, enum sizes, numeric range consistency, and ObjectId ref presence. Gates on errors. |
| `index-builder.agent.ts` | Infers unique indexes from field flags, merges explicit IndexConfig, deduplicates, produces `.index()` call strings. |
| `schema-optimizer.agent.ts` | Deduplicates fields and indexes. Produces advisory suggestions for timestamps, maxlength, and ref indexing. |
| `schema-builder.agent.ts` | Assembles final TypeScript/Mongoose schema file: imports, `new Schema({})`, index calls, `model()` export. |

### L3 — Utils

| File | Responsibility |
|------|----------------|
| `type-mapper.util.ts` | `JS_TO_MONGOOSE_TYPE_MAP` dictionary, `mapToMongooseType()`, `isReferenceType()`, `isScalarType()`. |
| `naming.util.ts` | `toPascalCase`, `toCamelCase`, `toCollectionName` (pluralization), `toSchemaVarName`, `toModelVarName`. |
| `schema-format.util.ts` | Formatting helpers: `buildImportBlock`, `buildSchemaOptions`, `formatIndexCall`, `wrapSchemaBlock`, `wrapModelExport`. |
| `default-values.util.ts` | `formatDefaultValue()` — serializes defaults to JS literal strings. `hasDefault()`, `inferDefaultFromType()`. |
| `logger.util.ts` | Structured `buildLog` and `buildError` strings with ISO timestamp and source label. |

---

## 3. Import Relationships

```
index.ts
  └── orchestrator.ts (L1)
        ├── agents/field-mapper.agent.ts (L2)
        │     └── utils/default-values.util.ts, logger.util.ts, type-mapper.util.ts (L3)
        ├── agents/relation-mapper.agent.ts (L2)
        │     └── utils/logger.util.ts (L3)
        ├── agents/validation-builder.agent.ts (L2)
        │     └── utils/logger.util.ts (L3)
        ├── agents/index-builder.agent.ts (L2)
        │     └── utils/logger.util.ts, schema-format.util.ts (L3)
        ├── agents/schema-optimizer.agent.ts (L2)
        │     └── utils/logger.util.ts (L3)
        ├── agents/schema-builder.agent.ts (L2)
        │     └── utils/logger.util.ts, naming.util.ts, schema-format.util.ts (L3)
        ├── state.ts (L0)
        ├── types.ts (L0)
        └── utils/naming.util.ts (L3)
```

**Rules enforced:**
- L1 imports L2, L3, and L0 only
- L2 imports L3 and L0 only — zero agent-to-agent imports (except schema-builder which imports field-mapper and relation-mapper types, not implementations)
- L3 is self-contained — imports only from L0 types where needed
- L0 has no imports

---

## 4. Example Schema Generation

### Input

```typescript
import { generateSchema, INITIAL_STATE } from "./index.js";

const result = generateSchema(
  {
    name: "BlogPost",
    timestamps: true,
    fields: [
      {
        name: "title",
        type: "String",
        isArray: false,
        isOptional: false,
        validation: { required: true, trim: true, maxLength: 200 },
      },
      {
        name: "content",
        type: "String",
        isArray: false,
        isOptional: false,
        validation: { required: true },
      },
      {
        name: "status",
        type: "String",
        isArray: false,
        isOptional: false,
        defaultValue: "draft",
        validation: { enum: { values: ["draft", "published", "archived"] } },
      },
      {
        name: "views",
        type: "Number",
        isArray: false,
        isOptional: false,
        defaultValue: 0,
        validation: { min: 0 },
      },
      {
        name: "tags",
        type: "String",
        isArray: true,
        isOptional: true,
      },
    ],
    relations: [
      {
        fieldName: "author",
        refModel: "User",
        type: "one-to-many",
        isArray: false,
      },
      {
        fieldName: "categories",
        refModel: "Category",
        type: "many-to-many",
        isArray: true,
      },
    ],
    indexes: [
      { fields: { status: 1, createdAt: -1 }, background: true, name: "status_date" },
    ],
  },
  INITIAL_STATE,
);
```

### Output: `result.output.schema`

```typescript
import { Schema, model, Types } from "mongoose";

const BlogPostSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: "draft",
    enum: ["draft", "published", "archived"]
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [String],
  author: { type: Schema.Types.ObjectId, ref: "User" },
  categories: [{ type: Schema.Types.ObjectId, ref: "Category" }],
}, {
  timestamps: true,
  collection: "blogPosts"
});

BlogPostSchema.index({"status":1,"createdAt":-1}, {"background":true,"name":"status_date"});

export const BlogPost = model("BlogPost", BlogPostSchema);
```

---

## 5. Type Mapping Reference

| Input Type | Mongoose Type |
|-----------|--------------|
| `string`, `String` | `String` |
| `number`, `int`, `float` | `Number` |
| `boolean`, `bool` | `Boolean` |
| `date`, `datetime`, `timestamp` | `Date` |
| `objectid`, `ObjectId` | `Schema.Types.ObjectId` |
| `decimal`, `Decimal128` | `Schema.Types.Decimal128` |
| `mixed`, `any`, `json`, `object` | `Schema.Types.Mixed` |
| `uuid`, `UUID` | `Schema.Types.UUID` |
| `buffer` | `Buffer` |
| `map` | `Map` |

---

## 6. Validation Rules Rendered Inline

| FieldValidation Property | Mongoose Output |
|--------------------------|----------------|
| `required: true` | `required: true` |
| `required: [true, "msg"]` | `required: [true, "msg"]` |
| `unique: true` | `unique: true` (+ auto-index) |
| `trim: true` | `trim: true` |
| `lowercase: true` | `lowercase: true` |
| `uppercase: true` | `uppercase: true` |
| `enum: { values: [...] }` | `enum: ["a", "b"]` |
| `range.min` | `min: N` |
| `range.max` | `max: N` |
| `range.minLength` | `minlength: N` |
| `range.maxLength` | `maxlength: N` |
| `match` | `match: /pattern/` |

---

## 7. Three Public Entry Points

| Function | Purpose |
|----------|---------|
| `generateSchema(config)` | Full 6-step pipeline → returns compiled schema string |
| `validateSchema(config)` | Field mapping + validation only — no output generation |
| `optimizeSchema(config)` | Field mapping + indexing + optimization report — no schema string |
