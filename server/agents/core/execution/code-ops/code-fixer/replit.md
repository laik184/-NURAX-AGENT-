# CODE-FIXER Agent (Execution Layer)

## Purpose
`code-fixer` is a stateless orchestration agent that coordinates automated code fixing in a deterministic closed loop:

`detect -> decide -> apply -> verify -> repeat`

## What it does
- Runs code smell detection via `code-smell-detector`.
- Uses `auto-fix-strategy` for strategy decisions per smell.
- Builds deterministic fix plans.
- Applies changes via `patch-engine`.
- Verifies quality gates (typecheck/lint/tests; test-runner adapter optional).
- Retries using retry policy until success or `maxIterations`.
- Produces immutable final output with diffs and confidence score.

## What it does NOT do
- It does **not** implement smell detection itself.
- It does **not** invent strategy logic itself.
- It does **not** execute raw AST/string transformations directly.
- It does **not** call `api/`, `db/`, `planner/`, or `natural-language-to-spec/`.
- It does **not** generate product features.

## Pipeline diagram
```text
external caller
  -> index.ts
  -> code-fixer.orchestrator.ts
     -> validators/input.validator.ts
     -> fix-loop.manager.ts
        -> code-smell-detector.detect
        -> auto-fix-strategy.analyze
        -> fix-planner.service.ts
        -> validators/fix-plan.validator.ts
        -> patch-applier.service.ts
           -> patch-engine.applyPatch
        -> verification.service.ts
        -> retry-policy.service.ts
     -> diff-generator.service.ts
     -> confidence-scorer.service.ts
     -> utils/deep-freeze.ts
  -> FixResult
```

## Loop logic
1. Validate/normalize input.
2. Detect smells from current code snapshot.
3. Convert smells + strategy into patch plans.
4. Apply plans through patch engine.
5. Verify (typecheck/lint/tests).
6. If failed and retry policy allows, run next iteration.
7. Stop on success, no plans, or max iterations.

## Retry rules
- Retry only when verification fails.
- Stop when `iteration >= maxIterations`.
- Stop when no plans are available.
- All decisions are deterministic for same input and options.

## Diff format
Each `Diff` entry contains:
- `filePath`
- `before`
- `after`
- `unifiedDiff` (`--- a/`, `+++ b/`, hunk header)
- `linesAdded`, `linesRemoved`, `linesChanged`

## Confidence scoring
`confidence-scorer.service.ts` computes confidence in `[0,1]` using:
- applied fix rate,
- verification pass/fail,
- severity penalty,
- iteration penalty.

## File responsibilities (who calls whom)
- `index.ts`: public API.
- `code-fixer.orchestrator.ts`: top-level orchestration and dependency wiring.
- `fix-loop.manager.ts`: iterative execution control.
- `fix-planner.service.ts`: smell+strategy -> fix plans.
- `patch-applier.service.ts`: patch-engine coordination.
- `verification.service.ts`: runs verification adapter checks.
- `retry-policy.service.ts`: retry decision logic.
- `diff-generator.service.ts`: before/after diffs.
- `confidence-scorer.service.ts`: confidence model.
- `validators/*`: input and plan contracts.
- `utils/*`: small pure helpers.

## Example input -> output
Input:
```json
{
  "codebase": {
    "src/service.ts": "export function run(){return 1;}"
  },
  "options": {
    "maxIterations": 3,
    "runTests": true,
    "runLint": true,
    "runTypecheck": true
  }
}
```

Output sketch:
```json
{
  "fixedCode": {"src/service.ts": "...patched..."},
  "diffs": [{"filePath": "src/service.ts", "unifiedDiff": "--- a/..."}],
  "appliedFixes": [{"iteration": 1, "status": "SUCCESS"}],
  "failedFixes": [],
  "iterations": 1,
  "confidence": 0.91,
  "success": true
}
```
