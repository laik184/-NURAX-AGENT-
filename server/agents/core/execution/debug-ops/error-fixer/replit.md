# Error Fixer (HVP-Compliant)

## 1) Error → Fix Flow
```text
error input
  -> error-detector.agent
  -> root-cause-analyzer.agent
  -> fix-strategy.agent
  -> patch-generator.agent
  -> fix-applier.agent
  -> validation.agent
  -> (fallback.agent on failure)
  -> frozen output
```

## 2) File Responsibilities
- `orchestrator.ts` (L1): orchestration only, no domain/business repair logic.
- `types.ts` (L0): contracts (`ErrorReport`, `RootCause`, `FixStrategy`, `Patch`, `FixResult`, `ValidationResult`).
- `state.ts` (L0): immutable state container and controlled transitions.
- `agents/` (L2): single-purpose execution stages.
- `utils/` (L3): stacktrace parsing, classification, diff building, file read helper, logging helper.
- `index.ts`: public API exports (`fixError`, `analyzeError`, `applyPatch`).

## 3) Import Relationships
- L1 imports L2/L3/L0.
- L2 imports L3/L0 and infra modules only.
- L3 imports Node helpers only.
- No `agent -> agent` imports.
- No upward imports.

## 4) Patch Lifecycle
1. Generate patch with `before/after/diff`.
2. Apply patch through infra file-writer.
3. Validate with infra test-runner.
4. Roll back by rewriting `before` snapshot if validation fails.

## 5) Example Fix Scenario
`Cannot find module './foo.ts'`
1. detector classifies `MODULE_NOT_FOUND`
2. strategy selects `ADD_IMPORT`
3. generator converts `.ts` import suffixes to `.js`
4. applier writes changes safely
5. validator runs tests
6. fallback restores snapshot if tests fail
