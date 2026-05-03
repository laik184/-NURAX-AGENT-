# Diff Reviewer Utils Layer

## Purpose
L3 pure utility helpers used by L2 agents and orchestrator logging.

## Caller / Callee
- Callers: `../agents/*.agent.ts`, `../orchestrator.ts`
- Utils do not call agents or orchestrator.

## Import Diagram
`agents/*.agent.ts -> utils/*.util.ts`

## Files
- `diff-normalizer.util.ts`: normalize parsed change blocks
- `ast-parser.util.ts`: symbol scanning for export/break detection
- `file-mapper.util.ts`: map potential impacted files
- `pattern-matcher.util.ts`: heuristic risk pattern matcher
- `logger.util.ts`: consistent log message formatting
