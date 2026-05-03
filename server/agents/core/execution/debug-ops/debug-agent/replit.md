# Debug Agent (HVP)

## 1) Debugging flow
1. `orchestrator.ts` receives `error`, `logs`, `stacktrace`, and environment context.
2. `stacktrace-parser.agent.ts` normalizes logs and extracts stack frames.
3. `error-classifier.agent.ts` classifies error type.
4. `root-cause-analyzer.agent.ts` derives the primary root cause statement.
5. `dependency-checker.agent.ts` detects unresolved module dependencies.
6. `environment-checker.agent.ts` checks for missing environment variables.
7. `fix-suggester.agent.ts` ranks actionable remediations.
8. Orchestrator calculates confidence and returns frozen output.

## 2) File responsibilities
- `types.ts`: input/output contracts and internal parsed stack interfaces.
- `state.ts`: immutable state shape and initial factory.
- `orchestrator.ts`: sequencing only, state lifecycle, confidence assembly.
- `agents/*`: one responsibility per agent.
- `utils/*`: generic helpers only.
- `index.ts`: public API exports.

## 3) Import relationships
- L1 orchestrator imports L2 agents, L0 state/types, and L3 utils.
- L2 agents import only L3 utils and L0 types.
- L3 utils import no agents.

Diagram:
`index -> orchestrator -> agents -> utils`

No agent-to-agent imports are used.

## 4) Root cause detection logic
- Classify failure family from error/log patterns.
- Anchor the cause using the first failing stack frame when available.
- Attach supporting evidence strings.
- Suggest fixes mapped to error family and discovered dependency/env gaps.
- Confidence is weighted from stack quality, classification certainty, evidence richness, and fix availability.

## 5) Example input/output
Input:
```ts
{
  error: "Error: Cannot find module 'axios'",
  logs: ["at Object.<anonymous> (/app/src/client.ts:4:15)"],
  stacktrace: ["at Module._load (node:internal/modules/cjs/loader:988:27)"]
}
```

Output:
```ts
{
  success: true,
  errorType: 'DEPENDENCY',
  rootCause: 'Runtime failed due to unresolved dependency/module import.',
  confidence: 0.9,
  suggestions: ["Install/restore missing modules: axios"],
  logs: ["[2026-...Z] [INFO] Analysis started", "[2026-...Z] [INFO] Analysis complete with type DEPENDENCY"]
}
```
