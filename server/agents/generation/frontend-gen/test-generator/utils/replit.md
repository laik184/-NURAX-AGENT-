# Utils Layer (L3)

## Purpose
Utility-only helpers for parsing, selectors, template rendering, assertions, and file writes.

## Files
- `ast-parser.util.ts`: component metadata extraction and test-type detection.
- `test-template.util.ts`: builds final test file text from suite/cases.
- `assertion-builder.util.ts`: framework imports + core assertions.
- `selector.util.ts`: stable selector builders.
- `file-writer.util.ts`: output directory creation and file writing.

## Import graph
- `agents/* -> utils/*`
- `orchestrator -> utils/*`

No business orchestration logic belongs in this folder.
