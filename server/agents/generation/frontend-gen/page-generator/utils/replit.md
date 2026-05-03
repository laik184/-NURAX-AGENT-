# Utils Folder

Utility-only layer (L3). No business logic.

- `template-loader.util.ts`: framework template lookup.
- `code-formatter.util.ts`: lightweight code formatting helper.
- `naming.util.ts`: naming normalization functions.
- `file-structure.util.ts`: unique path-based file upsert helper.
- `logger.util.ts`: timestamped log helper.

Called by: `../agents/*`.
Imports from agents/orchestrator are forbidden.
