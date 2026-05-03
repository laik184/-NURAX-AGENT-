# Utils Folder

## Purpose
Helper utilities only (no generation orchestration logic).

## Responsibilities
- `template-loader.util.ts`: package/import templates.
- `naming.util.ts`: deterministic naming.
- `file-writer.util.ts`: persistent file write operation.
- `validation.util.ts`: config validation and deduplication.

## Import policy
- Utils can be imported by orchestrator and agents.
- Utils should not import agents.
