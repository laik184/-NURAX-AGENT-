# Utils Layer (L3)

Helper-only modules used by agents/orchestrator:
- `regex-parser.util.ts` → parse stacktrace line patterns.
- `log-normalizer.util.ts` → strip ANSI noise and normalize logs.
- `error-pattern.util.ts` → shared error-type pattern matching.
- `confidence-score.util.ts` → weighted confidence score helper.
- `logger.util.ts` → standardized timestamped log formatting.

Call graph:
`agents/orchestrator -> utils`

Rules:
- No domain orchestration logic in utils.
