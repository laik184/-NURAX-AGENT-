# Utils Layer

## Purpose
Reusable pure helpers for formatting, naming, path normalization, and templates.

## Files
- `route-template.util.ts`: framework-specific line template builder.
- `naming.util.ts`: naming/casing helpers.
- `path-builder.util.ts`: normalized route path helper.
- `formatter.util.ts`: file-level output formatting.

## Callers
Imported by files in `../agents`.

## Import diagram
`agents -> utils`
`utils -> ../types (where required)`
