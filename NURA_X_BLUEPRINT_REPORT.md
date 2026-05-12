# NURA X — Ultra Deep Scan Blueprint Report
**Date**: May 12, 2026  
**Scope**: Chat · Console · File Explorer · Preview · Agents — Frontend + Backend  
**Method**: Full source read of 30+ critical files, cross-reference of API routes vs frontend calls, event bus trace  

---

## EXECUTIVE SUMMARY

| Area | Status | Severity |
|---|---|---|
| Agent Run (Chat → Backend) | BROKEN — runId mismatch | CRITICAL |
| Agent SSE Stream | WORKS (bus-backed) | ✅ |
| File Explorer API | WORKS (IQ2000 mounted) | ✅ |
| File Explorer SSE | PARTIAL — `/sse/agent` double-write | LOW |
| Console SSE (`/sse/console`) | WORKS | ✅ |
| Console IQ2000 Pipeline | DEAD — frontend not listening | MEDIUM |
| Preview Runtime API | WORKS (pipeline mounted) | ✅ |
| Preview Tunnel Info | WORKS | ✅ |
| WebSocket Terminal | WORKS | ✅ |
| `use-agent-stream.ts` hook | DEAD — empty file | LOW |
| `sse.ts` `connectSSE()` | ORPHAN — nobody calls it | LOW |
| Event Bus | WORKS — central nervous system | ✅ |

---

## ARCHITECTURE OVERVIEW

```
Browser
  ├── ChatPanel (left panel)
  │     └── useAgentRunner.ts
  │           ├── POST /api/run       → RunController → executeToolLoopRun()
  │           └── EventSource /api/agent/stream?runId=X
  │
  ├── CenterPanel (right panel)
  │     ├── Preview tab   → <iframe> /preview/:id
  │     ├── Console tab   → EventSource /sse/console
  │     └── File editor tab
  │
  └── AppStateProvider (global)
        └── EventSource /sse/console  (all projects, no filter)

Backend (port 3001)
  ├── main.ts — Express app
  │     ├── /api/run        → run.routes.ts → RunController → tool-loop agent
  │     ├── /api            → previewPipeline (IQ2000)
  │     ├── /api            → fileExplorerPipeline (IQ2000)
  │     ├── /api            → consolePipeline (IQ2000)
  │     ├── chatOrchestrator.buildSseRouter()  → sse.ts (bus-backed SSE)
  │     └── chatOrchestrator.attachWebSocket() → ws-server.ts
  │
  └── Event Bus (server/infrastructure/events/bus.ts)
        ├── agent.event     → /api/agent/stream, /sse/agent, /events, /api/stream
        ├── run.lifecycle   → /api/agent/stream, /sse/preview, /events
        ├── console.log     → /sse/console, /sse/preview, /events
        └── file.change     → /sse/files, /sse/file, /events
```

---

## SECTION 1 — CRITICAL BUGS

### BUG-001 🔴 CRITICAL — Agent Run: runId Mismatch (BLOCKS ALL AI FUNCTIONALITY)

**File**: `client/src/components/chat/useAgentRunner.ts` line 75  
**File**: `server/api/run.routes.ts` line 21

**Root Cause**:
```typescript
// BACKEND — run.routes.ts returns runId at TOP LEVEL:
res.status(202).json({ ok: true, runId: handle.runId, status: handle.status });
//                               ^^^^^^^^ TOP LEVEL

// FRONTEND — useAgentRunner.ts reads from data.*:
runId = j.data?.runId || j.data?.id;
//       ^^^^^^ looks inside data — DOES NOT EXIST
```

**Effect**: `j.data` is `undefined`. Both `j.data?.runId` and `j.data?.id` are `undefined`. The line `if (!runId) throw new Error("server did not return runId")` always throws. Every single chat message fails immediately with an error in the chat window. **The AI agent is 100% non-functional.**

**Fix**:
```typescript
// useAgentRunner.ts line 75 — change to:
runId = j.runId || j.data?.runId || j.data?.id;
```

---

### BUG-002 🟠 MEDIUM — IQ2000 Console Pipeline: Frontend Not Connected

**Files**: `server/console/index.ts`, `client/src/context/app-state-context.tsx`, `client/src/pages/devtools/console.tsx`

**Root Cause**: The IQ2000 console pipeline streams at `/api/console/stream`. The frontend listens to `/sse/console` (chat SSE handler). These are two completely separate systems.

```
IQ2000 Console pipeline  → POST /api/console/capture → /api/console/stream (EventSource)
Frontend                 → GET  /sse/console          (chat bus subscriber)
```

The `/sse/console` chat handler works correctly via the event bus (`bus.subscribe("console.log")`). Logs DO flow through `/sse/console` IF agents emit `console.log` bus events (which they do via `server-lifecycle-tools.ts`). However the IQ2000 console's capture/filter/persist/history stages are NEVER used.

**Impact**: The IQ2000 console pipeline (5 stages, history, filtering) is dead code. Console works only for agent-emitted events, NOT for project subprocess stdout/stderr.

**Fix**: Either (a) wire `consolePipeline.captureService` to emit `bus.emit("console.log", ...)` on each captured line, or (b) add `/api/console/stream` as a second listener in `ConsolePanel`.

---

### BUG-003 🟠 MEDIUM — Project stdout/stderr Never Reaches Console

**File**: `server/preview/runtime/runtime.service.ts` (not read but inferred from architecture)  
**File**: `server/agents/tools/categories/server-lifecycle-tools.ts` line 35

**Root Cause**: When `runtimeService.run()` spawns a child process, its `stdout`/`stderr` are captured internally. The chat SSE console depends on `bus.emit("console.log", ...)` events. Only `server-lifecycle-tools.ts` emits these — only when the agent explicitly uses the `server_lifecycle` tool. Direct `npm run dev` child process output is never pushed to the bus.

**Effect**: Running a project from the Preview panel shows a blank console. No stdout/stderr appears.

**Fix**: In `runtime.service.ts`, on child process `stdout` and `stderr` data events, call `bus.emit("console.log", { projectId, stream: "stdout"/"stderr", line, ts })`.

---

## SECTION 2 — MINOR BUGS

### BUG-004 🟡 LOW — `/sse/agent` Double-Write

**File**: `server/chat/streams/sse.ts` lines 79–80

```typescript
r.get("/sse/agent", (req, res) => {
  const off = bus.subscribe("agent.event", (e) => {
    sseSend(res, "agent", e);          // writes: event: agent\ndata: {...}\n\n
    res.write(`data: ${JSON.stringify(e)}\n\n`);  // BUG: writes plain data again
  });
```

Every agent event sent on `/sse/agent` is written twice — once with an event type (correct SSE), once as a plain `data:` message. File explorer's `use-file-explorer.ts` connects to `/sse/agent` and uses `es.onmessage` (catches unnamed events) — it will receive the duplicate plain writes as well as the named events.

**Fix**: Remove the duplicate `res.write()` on line 80.

---

### BUG-005 🟡 LOW — `use-agent-stream.ts` is Empty Dead Code

**File**: `client/src/hooks/use-agent-stream.ts`

```typescript
export function useAgentStream(){}  // entire file
```

This hook is exported but does nothing. Nothing imports it. It should either be implemented or deleted.

---

### BUG-006 🟡 LOW — `sse.ts` Orphaned Helper

**File**: `client/src/sse.ts`

```typescript
export function connectSSE(onEvent: (data:any)=>void) {
  const es = new EventSource('/events');  // /events exists and works
  ...
}
```

The `/events` SSE endpoint DOES exist and works (all 4 bus event types). But `connectSSE()` is never imported or called anywhere in the frontend. Dead code.

---

### BUG-007 🟡 LOW — AppStateProvider Console: No projectId Filter

**File**: `client/src/context/app-state-context.tsx` line 57

```typescript
es = new EventSource('/sse/console');  // no ?projectId= param
```

The `/sse/console` handler supports `?projectId=N` filtering. Without it, `AppStateProvider.consoleOutput` receives logs from ALL projects. When multiple projects run simultaneously, logs will be intermixed. For single-user usage this is acceptable but not production-correct.

---

### BUG-008 🟡 LOW — Workspace projectId Hardcoded to localStorage "1"

**Files**: `client/src/components/chat/useAgentRunner.ts` line 63, `client/src/components/chat/index.tsx` line 28

```typescript
const projectId = Number(window.localStorage.getItem("nura.projectId") || "1") || 1;
```

Project ID is never set from URL params or server-side project creation. It defaults to `1`. This means all users share project 1. There is no real multi-project switching.

---

## SECTION 3 — WHAT WORKS CORRECTLY

### ✅ File Explorer API — Fully Wired
Frontend calls:
- `GET /api/list-files?projectPath=` → `tree.router.ts` → `treeController.listFiles()`
- `POST /api/save-file` → `crud.router.ts` → `crudController.saveFile()`
- `POST /api/rename-file` → `crud.router.ts` → `crudController.renameFile()`
- `POST /api/delete-file` → `crud.router.ts` → `crudController.deleteFile()`

All IQ2000 file-explorer pipeline routes are mounted at `app.use('/api', fileExplorerPipeline)` in `main.ts`. Frontend calls match exactly. **File explorer CRUD works.**

File-change SSE:
- Frontend `use-file-explorer.ts` listens to `/sse/files?projectId=` → chat SSE handler → `bus.subscribe("file.change")` ✅
- Frontend also listens to `/sse/agent` → for diff/file change notifications ✅

---

### ✅ Agent SSE Stream — Fully Wired
```
useAgentRunner.ts → EventSource /api/agent/stream?runId=X
                         ↓
chat/streams/sse.ts GET /api/agent/stream
  bus.subscribe("agent.event") → sseSend(res, "agent", e)
  bus.subscribe("run.lifecycle") → sseSend(res, "lifecycle", e)
                         ↓
useAgentRunner handles: agent.thinking, agent.tool_call, phase.*, file.written,
                        agent.question, agent.message, lifecycle events
```

The SSE wire is complete. The only reason it never fires is BUG-001 (runId mismatch prevents the agent from ever starting).

---

### ✅ Preview Runtime — Fully Wired
Frontend calls:
- `POST /api/run-project` → preview pipeline `runtime.router.ts` → `runtimeController.runProject()`
- `POST /api/stop-project` → `runtimeController.stopProject()`
- `GET /api/project-status` → `runtimeController.getStatus()`
- `GET /api/tunnel-info` → tunnel pipeline → `tunnelController.getTunnelInfo()`

All routes confirmed in IQ2000 preview pipeline, mounted at `app.use('/api', previewPipeline)`.

---

### ✅ WebSocket Terminal — Fully Working
`ws-server.ts` handles:
- `/ws/terminal?projectId=N` → bash shell in sandbox directory
- `/ws/execute/:sessionId` → session output streaming
- `/ws/agent/:runId` → agent event streaming over WS
- `/ws/files/:projectId` → chokidar file watcher over WS

---

### ✅ Event Bus — Central Nervous System
`server/infrastructure/events/bus.ts` is the single fan-out point:

| Event | Emitted by | Consumed by |
|---|---|---|
| `agent.event` | tool-loop agent, orchestrator, run executor | `/api/agent/stream`, `/sse/agent`, `/events`, `/api/stream`, WS `/ws/agent/:id` |
| `run.lifecycle` | RunController, tool-loop executor | `/api/agent/stream`, `/sse/preview`, `/events` |
| `console.log` | `server-lifecycle-tools.ts` | `/sse/console`, `/sse/preview`, `/events` |
| `file.change` | (agent tools that write files) | `/sse/files`, `/sse/file`, `/events` |

---

### ✅ Chat History + Prompts — Wired
```typescript
// ChatPanel
useQuery({ queryKey: ["/api/chat/history", projectId], queryFn: fetchChatHistory })
useQuery({ queryKey: ["/api/chat/prompts", projectId], queryFn: fetchChatPrompts })
```
Both endpoints are served by `chatOrchestrator.buildChatRouter()`.

---

### ✅ Console SSE — Works for Agent Events
`app-state-context.tsx` + `ConsolePanel` both connect to `/sse/console`. The chat SSE handler subscribes to `bus.console.log` events. Agent-emitted logs flow correctly. Project process logs do not (see BUG-003).

---

## SECTION 4 — ENDPOINT MASTER MAP

### Backend Routes (confirmed active in main.ts)

| Method | Path | Handler | Status |
|---|---|---|---|
| POST | `/api/run` | run.routes → RunController | ✅ |
| GET | `/api/run/:runId` | run.routes → getRun | ✅ |
| POST | `/api/run/:runId/cancel` | run.routes → cancel | ✅ |
| GET | `/api/agent/stream` | sse.ts (bus) | ✅ |
| GET | `/sse/console` | sse.ts (bus) | ✅ |
| GET | `/sse/files` | sse.ts (bus) | ✅ |
| GET | `/sse/agent` | sse.ts (bus, double-write bug) | BUGGY |
| GET | `/sse/preview` | sse.ts (bus) | ✅ |
| GET | `/events` | sse.ts (all events) | ✅ (unused) |
| WS | `/ws/terminal` | ws-server.ts | ✅ |
| WS | `/ws/execute/:id` | ws-server.ts | ✅ |
| WS | `/ws/agent/:id` | ws-server.ts | ✅ |
| WS | `/ws/files/:id` | ws-server.ts | ✅ |
| GET | `/api/list-files` | file-explorer tree.router | ✅ |
| POST | `/api/save-file` | file-explorer crud.router | ✅ |
| POST | `/api/rename-file` | file-explorer crud.router | ✅ |
| POST | `/api/delete-file` | file-explorer crud.router | ✅ |
| POST | `/api/run-project` | preview runtime.router | ✅ |
| POST | `/api/stop-project` | preview runtime.router | ✅ |
| GET | `/api/project-status` | preview runtime.router | ✅ |
| GET | `/api/tunnel-info` | preview tunnel.router | ✅ |
| GET | `/api/preview/health` | preview pipeline | ✅ |
| GET | `/api/file-explorer/health` | file-explorer pipeline | ✅ |
| GET | `/api/console/health` | console pipeline | ✅ |
| GET | `/api/health/llm` | main.ts | ✅ |
| POST | `/api/chat/answer` | chat router | ✅ |
| GET | `/api/chat/history` | chat router | ✅ |
| GET | `/api/chat/prompts` | chat router | ✅ |

### Frontend Calls Map

| Component | Calls | Backend Route | Works? |
|---|---|---|---|
| `useAgentRunner` | `POST /api/run` | ✅ exists | ❌ runId mismatch |
| `useAgentRunner` | `EventSource /api/agent/stream` | ✅ exists | ✅ (never reached due above) |
| `useAgentRunner` | `POST /api/run/:id/cancel` | ✅ exists | ✅ |
| `useAgentRunner` | `POST /api/chat/answer` | ✅ exists | ✅ |
| `use-file-explorer` | `GET /api/list-files` | ✅ exists | ✅ |
| `use-file-explorer` | `POST /api/rename-file` | ✅ exists | ✅ |
| `use-file-explorer` | `POST /api/delete-file` | ✅ exists | ✅ |
| `use-file-explorer` | `EventSource /sse/agent` | ✅ exists (buggy) | BUGGY |
| `use-file-explorer` | `EventSource /sse/console` | ✅ exists | ✅ |
| `use-file-explorer` | `EventSource /sse/files` | ✅ exists | ✅ |
| `preview-runtime.service` | `POST /api/run-project` | ✅ exists | ✅ |
| `preview-runtime.service` | `POST /api/stop-project` | ✅ exists | ✅ |
| `preview-runtime.service` | `GET /api/project-status` | ✅ exists | ✅ |
| `preview-runtime.service` | `GET /api/tunnel-info` | ✅ exists | ✅ |
| `app-state-context` | `EventSource /sse/console` | ✅ exists | ✅ (no pid filter) |
| `useAgentRunner` (save) | `POST /api/save-file` | ✅ exists | ✅ |

---

## SECTION 5 — PRIORITIZED FIX LIST

### Priority 1 — Fix Immediately (blocks all AI)

**P1-A: Fix runId mismatch in useAgentRunner.ts**
```typescript
// client/src/components/chat/useAgentRunner.ts — line 75
// BEFORE:
runId = j.data?.runId || j.data?.id;

// AFTER:
runId = j.runId || j.data?.runId || j.data?.id;
```
This single line fix unblocks the entire AI chat system.

---

### Priority 2 — Fix Soon (console unusable for project runs)

**P2-A: Pipe runtime stdout/stderr to event bus**

In `server/preview/runtime/runtime.service.ts`, when spawning child process:
```typescript
child.stdout.on("data", (chunk) => {
  bus.emit("console.log", {
    projectId: input.id,
    stream: "stdout",
    line: chunk.toString(),
    ts: Date.now(),
  });
});
child.stderr.on("data", (chunk) => {
  bus.emit("console.log", {
    projectId: input.id,
    stream: "stderr",
    line: chunk.toString(),
    ts: Date.now(),
  });
});
```

**P2-B: Connect IQ2000 console pipeline to event bus**

In `server/console/capture/capture.service.ts`, on each captured line, add:
```typescript
import { bus } from "../../infrastructure/events/bus.ts";
bus.emit("console.log", { projectId, stream, line, ts: Date.now() });
```

---

### Priority 3 — Fix When Stable

**P3-A: Fix `/sse/agent` double-write bug**
```typescript
// server/chat/streams/sse.ts line 80 — DELETE this line:
res.write(`data: ${JSON.stringify(e)}\n\n`);
```

**P3-B: Add projectId to AppStateProvider console SSE**
```typescript
// app-state-context.tsx — parameterize:
const projectId = Number(localStorage.getItem("nura.projectId") || "1") || 1;
es = new EventSource(`/sse/console?projectId=${projectId}`);
```

**P3-C: Implement or delete `use-agent-stream.ts`**
Either implement the hook properly or remove the dead file.

**P3-D: Remove orphaned `sse.ts` helper or wire it up**

---

## SECTION 6 — DATA FLOW TRUTH MAP

### Working Data Flows (after BUG-001 fix):

```
User types in ChatPanel
  → handleSend() → runAgent(msg)
  → POST /api/run {goal, projectId, mode}
  → RunController.runGoal() → newRunId() → executeToolLoopRun()
  → tool-loop agent: reads/writes files, emits bus events
  → bus.emit("agent.event", {...}) 
  → GET /api/agent/stream?runId=X (EventSource)
  → useAgentRunner handles: thinking/tool_call/message/lifecycle events
  → ChatMessages re-renders with streaming updates
```

```
Agent writes file
  → bus.emit("file.change", {...}) (if wired)
  → /sse/files?projectId= → use-file-explorer receives
  → refreshFiles() → GET /api/list-files → tree re-renders
```

```
Agent starts server (server_lifecycle tool)
  → bus.emit("console.log", {line, projectId})
  → /sse/console → AppStateProvider.consoleOutput updated
  → ConsolePanel renders output
```

### Broken Data Flows:

```
User clicks Run in Preview
  → POST /api/run-project ✅
  → runtimeService spawns child process ✅
  → child.stdout → [VOID — never emitted to bus] ❌
  → ConsolePanel shows nothing ❌
```

```
ChatPanel user sends message (CURRENT STATE before fix)
  → POST /api/run → responds {ok, runId, status} at TOP LEVEL
  → j.data?.runId → undefined
  → throw "server did not return runId" ❌
  → error message shown in chat ❌
```

---

## SECTION 7 — WHAT TO BUILD NEXT

After fixing the above bugs, these capabilities need implementation to complete the Replit-clone experience:

1. **Real projectId management** — URL param `/workspace/:id` should set `localStorage.nura.projectId`, and project creation should return an actual ID.

2. **File write → file explorer refresh connection** — When the agent writes a file (emits `file.written` bus event), the `/sse/files` SSE should push a notification. Currently `file.change` is the bus event for this but agents emit `file.written` which is a different event type not subscribed by SSE handlers.

3. **Console → Chat connection** — Running project output should appear in Chat as a live stream below the agent's response (like Replit's Console tab syncing with Chat).

4. **Preview iframe auto-refresh** — When agent completes a run, `bus.emit("run.lifecycle", {status: "completed"})` should trigger the preview iframe to reload.

5. **Diff viewer integration** — `useAgentRunner` handles `file.diff` events and renders `<FileDiffCard>` — this part is built. Needs the agent tools to actually emit `file.diff` bus events with the diff payload.

---

## APPENDIX — KEY FILE LOCATIONS

| Concern | File |
|---|---|
| Main server entry | `main.ts` |
| Agent run start | `server/api/run.routes.ts` |
| Run controller | `server/chat/run/controller.ts` |
| Tool loop agent | `server/agents/core/tool-loop/` |
| SSE hub | `server/chat/streams/sse.ts` |
| WebSocket hub | `server/chat/streams/ws-server.ts` |
| Event bus | `server/infrastructure/events/bus.ts` |
| File explorer pipeline | `server/file-explorer/index.ts` |
| Preview pipeline | `server/preview/index.ts` |
| Console pipeline | `server/console/index.ts` |
| Preview runtime service | `server/preview/runtime/runtime.service.ts` |
| Frontend chat | `client/src/components/chat/useAgentRunner.ts` |
| Frontend file explorer | `client/src/components/file-explorer/use-file-explorer.ts` |
| Frontend preview service | `client/src/pages/preview/preview-runtime.service.ts` |
| Frontend app state / SSE | `client/src/context/app-state-context.tsx` |
| Workspace layout | `client/src/pages/core/workspace.tsx` |
| App routing | `client/src/App.tsx` |
