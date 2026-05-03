# Execution Layer

## Purpose

The `execution/` module is the **sole module in Nura-X that performs actual OS-level operations**. It spawns processes, runs Docker containers, and allocates network ports. Every other module produces plans — this module runs them.

---

## What It Does

- Spawns OS processes via `child_process.spawn`
- Executes Docker CLI commands (`run`, `stop`, `rm`, `build`, `inspect`)
- Allocates and releases TCP/UDP ports using `net.createServer`
- Tracks active processes, running containers, and allocated ports in memory
- Returns immutable `RunnerResult` objects for every operation

## What It Does NOT Do

- No deployment planning
- No database logic
- No API calls to external services
- No UI, Git, or cloud provider SDK calls
- No business logic or strategy decisions

---

## File-by-File Responsibility

| File | Layer | Responsibility |
|------|-------|----------------|
| `types.ts` | — | All interfaces, type aliases. No imports. |
| `state.ts` | — | In-memory maps for processes, containers, ports, sessions. |
| `execution-orchestrator.ts` | L1 | Central runner controller. Routes via command-router. Sole writer to state. |
| `index.ts` | — | Public API re-exports only. |
| `orchestrator/command-router.ts` | L2 | Inspects `RunnerRequest`, decides which L3 runner to call. |
| `orchestrator/execution-orchestrator.ts` | L1 | Task-plan orchestrator (sequential/parallel shell commands). |
| `process/process-runner.ts` | L3 | `child_process.spawn` wrapper. Tracks PIDs. |
| `docker/docker-runner.ts` | L3 | Docker CLI execution. Container lifecycle. |
| `network/port-manager.ts` | L3 | Port availability probe. Allocation/release. |
| `utils/exec.helper.ts` | L4 | Raw spawn Promise wrapper with timeout + buffer limits. |
| `utils/stream.parser.ts` | L4 | Parses docker/process stdout/stderr into structured data. |

---

## HVP Layer Breakdown

```
L1 — execution-orchestrator.ts
      ↓
L2 — orchestrator/command-router.ts
      ↓              ↓               ↓
L3 — process/   docker/         network/
     runner      runner          port-manager
      ↓              ↓               ↓
L4 — utils/exec.helper.ts   utils/stream.parser.ts
```

---

## Call Flow

```
index.ts
  └─► execution-orchestrator.ts  (L1)
        ├─ validateRequest()
        ├─► orchestrator/command-router.ts  (L2)
        │     ├─ decide()  → target: "process" | "docker" | "network"
        │     ├─► process/process-runner.ts   (L3)
        │     │     └─► utils/exec.helper.ts  (L4) → spawn()
        │     ├─► docker/docker-runner.ts     (L3)
        │     │     └─► utils/exec.helper.ts  (L4) → spawn("docker", ...)
        │     └─► network/port-manager.ts     (L3)
        │           └─ net.createServer()     (Node built-in)
        ├─ update state (addProcess / addContainer / allocatePort)
        └─ return RunnerResult (frozen)
```

---

## Import Direction Rules

```
✅ ALLOWED:
  execution-orchestrator  → command-router
  execution-orchestrator  → state
  command-router          → process-runner
  command-router          → docker-runner
  command-router          → port-manager
  process-runner          → exec.helper
  process-runner          → stream.parser
  docker-runner           → exec.helper
  docker-runner           → stream.parser
  All runners             → types

❌ FORBIDDEN:
  process-runner  → docker-runner    (runner → runner)
  docker-runner   → port-manager     (runner → runner)
  state           → any runner
  utils           → any runner
  circular imports of any kind
```

---

## Example Execution Request / Response

### Run a shell command

```typescript
import { execute } from "./execution/index.js";

const result = await execute({
  id:      "req-001",
  type:    "process",
  command: "npm",
  args:    ["run", "build"],
  cwd:     "/srv/app",
  timeout: 60_000,
});

// result:
{
  success:   true,
  type:      "process",
  output:    "Build complete.",
  meta:      { exitCode: 0, requestId: "req-001" },
  timestamp: 1742169600000
}
```

### Start a Docker container

```typescript
const result = await execute({
  id:            "req-002",
  type:          "docker",
  command:       "run",
  containerName: "nura-api",
  image:         "nura-api:1.0.0",
  ports:         [{ host: 3000, container: 3000, protocol: "tcp" }],
});

// result:
{
  success:   true,
  type:      "docker",
  output:    "Container \"nura-api\" started (a1b2c3d4e5f6)",
  meta:      { containerId: "a1b2c3d4e5f6", requestId: "req-002" },
  timestamp: 1742169600100
}
```

### Allocate a free port

```typescript
const result = await allocatePort(undefined, "nura-api", "tcp");

// result:
{
  success:   true,
  type:      "network",
  output:    "Port 49200/tcp allocated for \"nura-api\"",
  meta:      { port: 49200, requestId: "..." },
  timestamp: 1742169600200
}
```

---

## Execution Lifecycle

```
1. Request → execution-orchestrator.validate()
2. Route   → command-router.decide()  (process / docker / network)
3. Execute → L3 runner via exec.helper (spawn) or net.createServer
4. Parse   → stream.parser normalises stdout/stderr
5. Record  → state.addProcess / addContainer / allocatePort
6. Return  → frozen RunnerResult
```

---

## State Stored

| Key | Type | Description |
|-----|------|-------------|
| `_processes` | `Map<id, ProcessRecord>` | All spawned processes |
| `_containers` | `Map<id, ContainerRecord>` | All started Docker containers |
| `_ports` | `Map<port, AllocatedPort>` | All allocated ports |
| `_sessions` | `Map<id, ExecutionSession>` | Task-runner sessions |

All state is **immutable outside `execution-orchestrator.ts`**.
