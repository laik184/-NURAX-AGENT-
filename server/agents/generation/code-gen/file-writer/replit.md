# File Writer Module

## 1) Module Purpose
This module provides safe, atomic file create, update, and delete operations with backup support and immutable operation state tracking.

## 2) File Responsibilities
- `types.ts`: shared contracts for actions, requests, results, and logs.
- `state.ts`: immutable module state storage and controlled state recording.
- `orchestrator.ts`: routes operations and coordinates path resolution, existence check, backup, execution, and logging.
- `index.ts`: public API exports.
- `agents/file-create.agent.ts`: create-only file behavior.
- `agents/file-update.agent.ts`: update-only file behavior.
- `agents/file-delete.agent.ts`: delete-only file behavior.
- `agents/file-exists.agent.ts`: existence check behavior.
- `agents/backup-before-write.agent.ts`: backup creation behavior.
- `utils/path-resolver.util.ts`: path normalization and traversal protection.
- `utils/file-lock.util.ts`: in-process lock management.
- `utils/content-normalizer.util.ts`: content normalization.
- `utils/diff.util.ts`: content diff check.
- `utils/logger.util.ts`: operation log construction and formatting.

## 3) Flow (Step-by-step)
1. `orchestrator.ts` receives `{ action, path, content? }`.
2. Path is validated and resolved.
3. Existence is checked.
4. If action is `update` or `delete`, backup is created first.
5. Action is delegated to the single-purpose agent.
6. Operation is logged and persisted to immutable state.
7. Frozen result is returned.

## 4) Import Relationships
- L1: `orchestrator.ts` imports L2 agents, L3 utils, and L0 state/types.
- L2: agents import only L3 utils (or Node APIs).
- L3: utils are standalone helpers.
- L0: shared foundational types and state.

Import diagram:
`index -> orchestrator -> agents -> utils`

## 5) Example Usage
```ts
import { writeFile, updateFile, deleteFile } from "./index.js";

await writeFile("tmp/example.txt", "hello");
await updateFile("tmp/example.txt", "hello world");
await deleteFile("tmp/example.txt");
```
