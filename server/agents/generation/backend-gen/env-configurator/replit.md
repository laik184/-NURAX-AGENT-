# env-configurator module

## 1) Module overview
The `env-configurator` module provides a focused environment configuration engine that builds schema definitions, loads environment files, applies defaults, validates values, and writes synchronized `.env` files for `dev`, `test`, and `prod` workflows.

## 2) File responsibilities
- `types.ts` — Core contracts for schema, variable definitions, validation results, and orchestrator outputs.
- `state.ts` — Immutable runtime state factory used by the orchestrator.
- `orchestrator.ts` — Coordinates the end-to-end flow only: schema → load → defaults → validate → sync/write.
- `index.ts` — Public API exporting `setupEnv()`, `validateEnv()`, `syncEnv()`.

### Agents (L2)
- `agents/schema-builder.agent.ts` — Creates environment-specific schema definitions.
- `agents/env-loader.agent.ts` — Reads existing `.env` files.
- `agents/default-provider.agent.ts` — Applies schema defaults where values are missing.
- `agents/env-validator.agent.ts` — Validates required keys and value constraints.
- `agents/env-sync.agent.ts` — Merges only missing values without overwriting existing ones.
- `agents/env-generator.agent.ts` — Serializes and writes env values to disk.

### Utils (L3)
- `utils/env-parser.util.ts` — Parses raw env text into key-value records.
- `utils/file-writer.util.ts` — Filesystem write/existence helpers.
- `utils/schema-normalizer.util.ts` — Deduplicates and normalizes schema entries.
- `utils/value-sanitizer.util.ts` — Sanitizes and quotes values safely.
- `utils/logger.util.ts` — Creates structured log lines.

## 3) Flow diagram
`orchestrator -> schema-builder -> env-loader -> default-provider -> env-validator -> env-sync -> env-generator`

## 4) Import relationships
- L1 (`orchestrator.ts`) imports L2 agents + L0 state/types + L3 logger util.
- L2 agents import only L3 utils and L0 types.
- L3 utils are helper-only and contain no domain orchestration.
- No L2-to-L2 imports and no upward imports.

## 5) Example .env
```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgres://localhost:5432/app"
LOG_LEVEL=info
JWT_SECRET="replace-me"
```
