# patch-engine/validators

## Purpose
Validation layer for the patch-engine module.
Ensures patch inputs are well-formed before execution and patch outputs are
logically consistent after execution.

Added in refactor April 2026 to complete the HVP validation layer
that was previously missing from patch-engine.

## Files

| File | Purpose |
|---|---|
| `input.validator.ts` | Validates `PatchRequest` and `BatchPatchRequest` before processing |
| `patch-output.validator.ts` | Validates `PatchResult` and `BatchPatchResult` for logical consistency |

## Rules
- Input validation runs BEFORE any patch agent is invoked
- Output validation runs AFTER orchestrator returns results
- All validation functions are pure and side-effect free
