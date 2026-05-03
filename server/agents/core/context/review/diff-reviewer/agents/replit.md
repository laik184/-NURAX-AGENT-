# Diff Reviewer Agents Layer

## Purpose
L2 agents encapsulate one analysis responsibility each and are orchestrated by `../orchestrator.ts`.

## Caller / Callee
- Caller: `../orchestrator.ts`
- Callee utils:
  - `diff-parser.agent.ts` -> `../utils/diff-normalizer.util.ts`
  - `risk-analyzer.agent.ts` -> `../utils/pattern-matcher.util.ts`
  - `breaking-change-detector.agent.ts` -> `../utils/ast-parser.util.ts`
  - `dependency-impact.agent.ts` -> `../utils/file-mapper.util.ts`

## Import Diagram
`orchestrator.ts -> agents/*.agent.ts -> utils/*.util.ts`

## Files
- `diff-parser.agent.ts`: parse raw diff into `FileChange[]`
- `change-classifier.agent.ts`: infer `ChangeType`
- `risk-analyzer.agent.ts`: produce `RiskFinding[]`
- `breaking-change-detector.agent.ts`: produce `BreakingChange[]`
- `dependency-impact.agent.ts`: produce `ImpactedFile[]`
- `review-decision.agent.ts`: map findings to final decision
