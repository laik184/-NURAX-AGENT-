# storage-agent Module

## 1) Module Purpose
The `storage-agent` module provides a deterministic, layered local data management system for React Native generation workflows. It coordinates four storage strategies (AsyncStorage, MMKV, SQLite, Secure Storage) while enforcing immutability, pure transitions, and strict separation of concerns.

## 2) Folder Structure
```
storage-agent/
├── agents/
│   ├── async-storage.agent.ts
│   ├── mmkv-storage.agent.ts
│   ├── sqlite-storage.agent.ts
│   ├── secure-storage.agent.ts
│   └── storage-selector.agent.ts
├── utils/
│   ├── key-normalizer.util.ts
│   ├── serialization.util.ts
│   ├── encryption.util.ts
│   └── deep-freeze.util.ts
├── orchestrator.ts
├── index.ts
├── types.ts
├── state.ts
└── Replit.md
```

## 3) Call Flow Diagram
User Request  
→ `orchestrator`  
→ `storage-selector.agent`  
→ specific storage agent  
→ `utils` (if needed)  
→ immutable response

## 4) File Responsibilities
- `types.ts`: Canonical contracts (`StorageInput`, `StorageOutput`, state, transitions, execution result).
- `state.ts`: Immutable initial state and pure state transition function.
- `orchestrator.ts`: Coordination only (select mode, delegate, aggregate logs, return frozen output).
- `index.ts`: Public surface; exports only orchestrator factory.
- `agents/async-storage.agent.ts`: Basic key-value operations (`GET`, `SET`, `REMOVE`, `CLEAR`).
- `agents/mmkv-storage.agent.ts`: Fast read/write and cache-aware logs.
- `agents/sqlite-storage.agent.ts`: Structured table create/read/write/delete operations.
- `agents/secure-storage.agent.ts`: Encrypted key-value operations for sensitive data.
- `agents/storage-selector.agent.ts`: Mode selection policy.
- `utils/key-normalizer.util.ts`: Key/table normalization and collision reduction.
- `utils/serialization.util.ts`: Safe stringify/parse for undefined/null handling.
- `utils/encryption.util.ts`: Symmetric deterministic obfuscation helpers.
- `utils/deep-freeze.util.ts`: Recursive freeze utility for immutable outputs.

## 5) Import Rules
- L1 (`orchestrator.ts`) coordinates only.
- L2 (`agents/`) contains storage logic.
- L3 (`utils/`) are pure helpers with no imports.
- L0 (`types.ts`, `state.ts`) defines contracts and state transitions.
- No agent imports another agent.
- No cross-module imports.
- All outputs are immutable (`Object.freeze` via `deepFreeze`).

## 6) Example Use Case
1. Client builds orchestrator with `runStorageOrchestrator(input, currentState)`.
2. Request `{ operation: "SET", key: "auth.token", value: "abc", sensitive: true }`.
3. Selector routes to `SECURE` mode.
4. Secure agent serializes, encrypts, and writes to secure state.
5. Immutable `StorageOutput` is returned with full operation logs.
