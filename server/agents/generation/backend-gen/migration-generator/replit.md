# Migration Generator (HVP-Compliant)

## 1) Migration Generation Flow
The orchestrator executes a strict, linear pipeline:

```text
orchestrator -> schema-diff.agent -> safety-check.agent -> migration-builder.agent -> naming-strategy.agent -> template-selector.agent -> file-generator.agent
```

- `generateMigration()` receives `currentSchema` and `targetSchema`.
- The diff agent finds schema delta (`add/remove/modify`).
- Safety checks block destructive operations by default.
- Migration builder creates SQL steps.
- Naming strategy creates versioned migration filename.
- Template selector chooses SQL or ORM output format.
- File generator writes (or previews) migration file.

## 2) File Responsibilities
- `orchestrator.ts`: controls pipeline only, no schema business rules.
- `agents/schema-diff.agent.ts`: compare schemas and detect changes.
- `agents/safety-check.agent.ts`: destructive-change policy checks.
- `agents/migration-builder.agent.ts`: converts change list to migration steps.
- `agents/naming-strategy.agent.ts`: timestamped version naming.
- `agents/template-selector.agent.ts`: SQL/ORM template selection.
- `agents/file-generator.agent.ts`: migration content render + disk write.
- `utils/sql-template.util.ts`: SQL helper formatting primitives.
- `utils/file-writer.util.ts`: filesystem write helper.
- `utils/timestamp.util.ts`: UTC migration timestamp helper.
- `utils/string-format.util.ts`: snake_case & default-value formatting helpers.
- `utils/logger.util.ts`: structured logs utility.
- `types.ts`: all shared domain contracts.
- `state.ts`: immutable generator state transitions.
- `index.ts`: public exports.

## 3) Import Relationships (Layering)
- L1 `orchestrator.ts` imports from L2 agents and L0 state/types.
- L2 agents import from L3 utils and L0 types.
- L3 utils are pure helpers and do not import agents/orchestrator.
- No agent imports another agent.

## 4) Naming Strategy
Migration filename format:

```text
YYYYMMDDHHMMSS_<snake_case_label>.<sql|ts>
```

Example:

```text
20260406091522_add_users_table.sql
```

## 5) Example Output

```json
{
  "success": true,
  "filePath": "server/migrations/20260406091522_add_users_table.sql",
  "migrationName": "20260406091522_add_users_table.sql",
  "changes": [
    { "type": "add_table", "table": "users" }
  ],
  "logs": [
    "[2026-04-06T09:15:22.000Z] [INFO] [orchestrator] Migration generation started."
  ]
}
```

All orchestrator outputs are returned as `Object.freeze(output)`.
