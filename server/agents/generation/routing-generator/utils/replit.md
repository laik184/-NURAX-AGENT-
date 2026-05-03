# routing-generator/utils

## Purpose
L3 helper utilities reused by agents and orchestrator.

## File responsibilities
- `path-parser.util.ts`: converts file paths to route paths and normalizes dynamic segments.
- `naming.util.ts`: consistent handler and file naming.
- `template-loader.util.ts`: framework-specific template string builders.
- `file-writer.util.ts`: safe write helper with no-overwrite default.
- `logger.util.ts`: scoped timestamped log lines.

## Import diagram
`orchestrator | agents -> utils`
`utils -> types (only where needed)`
No utility contains route domain orchestration.
