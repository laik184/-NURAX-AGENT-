# Agents Layer (L2)

Each agent performs one task and is only called by `../orchestrator.ts`.

- `schema-parser.agent.ts`: validate and normalize incoming model schema.
- `relation-mapper.agent.ts`: map relationship metadata.
- `constraint-builder.agent.ts`: derive PK/unique/required constraints.
- `index-builder.agent.ts`: derive indexes from schema fields and explicit definitions.
- `model-builder.agent.ts`: compose canonical model artifact for rendering.
- `orm-adapter.agent.ts`: transform canonical artifact into ORM-specific code.
