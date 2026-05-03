# Agents Layer (L2)

Each file in this folder performs exactly one task:
- `stacktrace-parser.agent.ts` → parse and normalize stack traces.
- `error-classifier.agent.ts` → classify error family.
- `root-cause-analyzer.agent.ts` → infer root cause summary and evidence.
- `dependency-checker.agent.ts` → identify missing modules/packages.
- `environment-checker.agent.ts` → detect missing env/config keys.
- `fix-suggester.agent.ts` → produce ranked actionable fixes.

Call graph:
`orchestrator.ts -> each agent`

Rules:
- No agent imports another agent.
- Agents may import `../types` and `../utils/*` only.
