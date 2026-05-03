# Utils Folder

Utility-only helpers for the service generator.

- `prompt-builder.util.ts`: prompt text builder.
- `template-loader.util.ts`: framework template snippets.
- `naming.util.ts`: naming normalization and file/class naming.
- `formatter.util.ts`: output formatting.
- `logger.util.ts`: log object builder.

Import diagram:
- `orchestrator.ts -> agents/*`
- `agents/* -> utils/*`
- `utils/* -> types.ts` (optional, type-only)
