# Diff Reviewer Module

## 1) Module Purpose
The `diff-reviewer` module provides a pre-apply safety gate for code changes. It parses a proposed diff, classifies change types, evaluates risks, detects potential breaking changes, estimates dependency ripple effects, and emits a final review decision (`APPROVE | WARN | REJECT`).

## 2) File Responsibilities

### L1
- `orchestrator.ts`
  - Coordinates end-to-end flow only.
  - Owns immutable state progression through `state.ts` helper functions.

### L2 (`agents/`)
- `diff-parser.agent.ts`: Parse raw git diff into normalized file changes.
- `change-classifier.agent.ts`: Infer `add/remove/modify` type per file.
- `risk-analyzer.agent.ts`: Scan added lines for security/performance/logic risk patterns.
- `breaking-change-detector.agent.ts`: Detect likely API/schema contract breaks.
- `dependency-impact.agent.ts`: Estimate impacted sibling files/modules.
- `review-decision.agent.ts`: Convert findings to final decision.

### L3 (`utils/`)
- `diff-normalizer.util.ts`: Normalize diff fragments.
- `ast-parser.util.ts`: Lightweight symbol scanning helper.
- `file-mapper.util.ts`: Map changed files to likely impacted files.
- `pattern-matcher.util.ts`: Match risk heuristics from changed lines.
- `logger.util.ts`: Build structured log messages.

### L0
- `types.ts`: Shared types and output contracts.
- `state.ts`: Immutable state transitions for orchestrator-controlled updates.

### Root exports
- `index.ts`: Public API: `reviewDiff()`, `getRiskReport()`, `validateChange()`.

## 3) Flow Diagram
1. `orchestrator.reviewDiff(input)`
2. `diff-parser.agent.parseDiff(input)`
3. `change-classifier.agent.classifyChanges(parsed)`
4. `risk-analyzer.agent.analyzeRisks(classified)`
5. `breaking-change-detector.agent.detectBreakingChanges(classified)`
6. `dependency-impact.agent.analyzeDependencyImpact(classified)`
7. `review-decision.agent.makeReviewDecision(risks, breakingChanges)`
8. Return frozen output object.

## 4) Import Relationships
- `orchestrator.ts` -> `agents/*`, `state.ts`, `utils/logger.util.ts`, `types.ts`
- `agents/*` -> `utils/*`, `types.ts`
- `utils/*` -> local helpers only
- `index.ts` -> `orchestrator.ts`, `types.ts`

No agent imports another agent. All dependencies flow downward.

## 5) Example Diff Review
Input:
```ts
const input = {
  diffId: "D-1024",
  diff: `diff --git a/server/api/user.ts b/server/api/user.ts\n@@ -10,0 +11,1 @@\n+const q = "SELECT * FROM users WHERE id = " + userId;`,
};
```

Result (shape):
```ts
{
  success: true,
  decision: "REJECT",
  risks: [
    {
      filePath: "server/api/user.ts",
      level: "critical",
      category: "security",
      message: "Potential SQL injection pattern detected."
    }
  ],
  breakingChanges: [],
  impactedFiles: [
    {
      sourceFile: "server/api/user.ts",
      impactedFile: "server/api/index.ts",
      reason: "Directory barrel export may need update."
    }
  ],
  logs: ["[orchestrator] ..."]
}
```
