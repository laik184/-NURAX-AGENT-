# Utils Folder - Codebase Indexer

## Purpose
Reusable helper utilities for path handling, filtering, hashing, chunking, and logging.

## Files
- `path-resolver.util.ts`: root/relative path normalization.
- `file-filter.util.ts`: source-file allowlist and binary/dir filtering.
- `hash.util.ts`: SHA-256 hashing utility.
- `chunker.util.ts`: line-based chunking helper.
- `logger.util.ts`: timestamped log/error appender.

## Import Direction
Agents/orchestrator can import utils. Utils import no domain agents.
