# DIFF PROPOSER (HVP Execution-Preparation Layer)

## Purpose
`diff-proposer` is a stateless, deterministic module that analyzes in-memory source files and structured change intent to produce **minimal, safe unified diffs**.

## Handles
- Input validation for target files and intent.
- Intent normalization into explicit operations.
- AST-aware parsing (TS/JS family via Babel when supported).
- Precise edit location and line-range planning.
- Minimal patch planning (`add`, `update`, `delete`).
- Unified diff generation (git-style headers and hunks).
- Safety checks (syntax preservation and edit-span bounds).
- Conflict detection for overlapping ranges.
- Immutable output generation.

## Does NOT Handle
- Applying patches.
- File-system writes.
- Command execution.
- Runtime/sandbox/deployer integration.
- Persistent state or VCS operations.

## File-by-file responsibilities
- `index.ts`: Public entry for external callers.
- `types.ts`: Shared contracts for inputs/outputs and pipeline envelopes.
- `diff.orchestrator.ts`: Full pipeline coordination and immutable finalization.
- `intent-parser.service.ts`: Converts structured intent into normalized operations.
- `file-loader.service.ts`: Normalizes and filters in-memory file payloads.
- `ast-parser.service.ts`: Parses supported code to syntax/symbol envelopes.
- `locator.service.ts`: Maps normalized operations to exact line ranges.
- `edit-planner.service.ts`: Produces deduplicated, ordered minimal patch plans.
- `diff-generator.service.ts`: Applies plans in-memory and emits unified diffs.
- `safety-checker.service.ts`: Enforces scope/syntax safety heuristics.
- `conflict-detector.service.ts`: Detects overlapping/unsafe edit ranges.
- `formatter.service.ts`: Canonical proposal formatting and deterministic timestamps.
- `validators/input.validator.ts`: Input contract enforcement.
- `validators/diff.validator.ts`: Diff proposal contract enforcement.
- `utils/ast.helper.ts`: Babel parser helpers and symbol extraction.
- `utils/text-diff.helper.ts`: Unified-diff text construction.
- `utils/range.helper.ts`: Range conversion, overlap checks, clamping.
- `utils/hash.helper.ts`: Stable deterministic hashing.
- `utils/deep-freeze.ts`: Deep immutability helper.
- `utils/error.helper.ts`: Domain error/warning helpers.

## Diff pipeline diagram
```text
external caller
   -> index.ts
   -> diff.orchestrator.ts
      -> validators/input.validator.ts
      -> intent-parser.service.ts
      -> file-loader.service.ts
      -> ast-parser.service.ts
      -> locator.service.ts
      -> edit-planner.service.ts
      -> diff-generator.service.ts
      -> safety-checker.service.ts
      -> conflict-detector.service.ts
      -> formatter.service.ts
      -> validators/diff.validator.ts
      -> utils/deep-freeze.ts
   -> DiffProposerOutput
```

## Minimal-edit strategy rules
1. Normalize all text to LF before planning.
2. Preserve file ordering by path for deterministic behavior.
3. Plan edits only at explicit located ranges.
4. Deduplicate equal patches (type + range + content).
5. Sort patches by range start to avoid nondeterministic splice order.
6. Generate only changed-file diffs.

## Safety and conflict rules
- Reject invalid inputs and duplicate target file paths.
- Detect overlapping planned ranges and emit warnings.
- Enforce maximum edit-span threshold per patch.
- Re-parse post-edit content for AST-supported files; warn and lower confidence on syntax break.
- Confidence is bounded to `[0,1]` and deterministic.

## Import rules
Allowed inside this module:
- Internal files under `diff-proposer/`
- `validators/`
- `utils/`
- Type-safe external parser deps (`@babel/parser`, `@babel/traverse`, `@babel/types`)

Forbidden:
- `runtime/`, `sandbox/`, `deployer/`
- Filesystem writers
- VCS/git clients
- External agent modules

## Example input -> output sketch
Input:
```json
{
  "targetFiles": [{ "path": "src/auth/service.ts", "content": "export const x = 1;" }],
  "changeIntent": {
    "action": "add_validation",
    "details": {
      "insertAfter": "export const x = 1;",
      "content": "export const emailValidation = true;"
    }
  }
}
```

Output (`DiffProposal` item):
```json
{
  "filePath": "src/auth/service.ts",
  "patches": [{ "type": "add", "range": { "start": 1, "end": 1 }, "content": "export const emailValidation = true;" }],
  "unifiedDiff": "--- a/src/auth/service.ts\n+++ b/src/auth/service.ts\n@@ -2,0 +2,1 @@\n+export const emailValidation = true;",
  "affectedSymbols": ["unknown"],
  "warnings": [],
  "confidence": 1,
  "generatedAt": "1970-..."
}
```
