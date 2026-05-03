# NURA X — Full System X-Ray

> Brutally honest, evidence-only audit. Every claim cites a real file path / line that exists in this repository today.

---

## 0. TL;DR — What you actually have

| Layer | Reality |
|---|---|
| **Frontend** | 185 TS/TSX files, 19 routed pages (`client/src/App.tsx`). One real workspace (`/workspace`), ~17 marketing/import/utility pages. The "chat → agent" flow is real **only** through `ChatPanel.runAgent` (`client/src/components/ChatPanel.tsx:567`). Workspace's other "Send" buttons are wired to local UI state (e.g. invite email), not the agent. Two files share the name `Dashboard.tsx` (different exports). |
| **Backend** | Express on port 3001 (`main.ts`), Vite on 5000 with proxy. ~14 route files + 2 streams + 1 proxy + 8 services + a 2,001-file `server/agents/` tree. **746 `*.agent.ts` files, 123 `orchestrator.ts` files, 122 wired into `ORCHESTRATOR_REGISTRY`** (`server/agents/core/pipeline/registry/orchestrator.registry.ts`). |
| **Real execution** | YES, but narrow. `project-runner.service.ts` actually `spawn`s child processes in `.sandbox/<projectId>/`, allocates ports 4001-4999, streams stdout to the event bus, and `preview-proxy.ts` proxies HTTP+WS to those ports. `package-manager.service.ts` and `git.service.ts` shell out for real. |
| **Agent loop** | Linear 9-phase pipeline (`executePipeline` in `server/agents/core/pipeline/orchestrator.ts`): safety → routing → decision → planning → validation → generation (parallel dispatch ≤5) → execution → recovery → feedback. **There is no true ReAct/tool-calling loop.** The LLM is called for *intent parsing* and *planning text*, not for iterative tool invocation. |
| **DB** | Replit Postgres via Drizzle. Only 7 tables (`shared/schema.ts`): `projects, chat_messages, agent_runs, agent_events, artifacts, diff_queue, console_logs`. No `users`, no `sessions`, no `secrets`, no `deployments`. |
| **Tests** | `package.json:11` runs `node --test server/agents/dependencies/tests/*.test.ts`. **That directory does not exist.** Zero tests. |
| **Security** | `/ws/terminal` opens `bash -i` in the **server's `process.cwd()`** when no `projectId` is provided (`server/streams/ws-server.ts:84`). `/api/solo-pilot/execute` runs arbitrary `command + args` with `shell: true` and no allow-list (`server/routes/solo-pilot.routes.ts:36-44`). |
| **Verdict** | Real plumbing for spawning sandboxed dev servers + streaming logs is there. Most of the "intelligence" (746 agents) is **isolated, type-safe TypeScript modules that produce data structures**, not an LLM-driven autonomous coder. The UI is wide; the brain is shallow. |

---

## 1. 3D System Layers (as actually built)

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1 — UI                                                    │
│   Vite dev server (port 5000)                                   │
│   client/src/App.tsx → wouter Router → 19 pages                 │
│   ChatPanel.tsx (1147 lines)  CenterPanel.tsx (783 lines)       │
│   Persistent SSE → /sse/console (app-state-context.tsx:57)      │
└──────────────┬──────────────────────────────────────────────────┘
               │ Vite proxy: /api /sse /ws /events /preview
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2 — HTTP / Streams (port 3001)                            │
│   main.ts → 14 route routers                                    │
│   server/streams/sse.ts (10 SSE channels, all backed by bus)    │
│   server/streams/ws-server.ts (4 WS channels)                   │
│   server/proxy/preview-proxy.ts (/preview/<id>/* → child port)  │
└──────────────┬──────────────────────────────────────────────────┘
               │ POST /api/run, POST /api/run-project, /api/fs/*…
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3 — Orchestration controller                              │
│   server/orchestration/controller.ts                            │
│   runGoal() inserts agent_runs, fire-and-forget executeAsync()  │
│   Wraps executePipeline() and persists files to sandbox + DB    │
└──────────────┬──────────────────────────────────────────────────┘
               │ executePipeline(input)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4 — Pipeline (9 phases, linear)                           │
│   server/agents/core/pipeline/orchestrator.ts                   │
│   safety → routing → decision → planning → validation           │
│   → generation [dispatch ≤5 from 122-entry registry] →          │
│   execution → recovery (cond) → feedback                        │
└──────────────┬──────────────────────────────────────────────────┘
               │ dispatch({capabilities, input}, MAX=5)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5 — Capability orchestrators (122 dynamic imports)        │
│   server/agents/{generation,intelligence,security,…}/*/         │
│   orchestrator.ts → calls L2 agents → L3 utils                  │
│   Output: data structures. Sometimes {path, content} objects.   │
└──────────────┬──────────────────────────────────────────────────┘
               │ controller.extractCodeFiles() walks output tree
               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 6 — Sandbox + Runtime                                     │
│   .sandbox/<projectId>/* (write CodeFile[] here)                │
│   project-runner.service.ts spawns dev server (npm run dev)     │
│   preview-proxy.ts routes /preview/<id>/* → 127.0.0.1:<port>    │
└─────────────────────────────────────────────────────────────────┘
```

Note: **Layer 4 and Layer 6 do NOT talk to each other**. Files written by the pipeline land in `.sandbox/<id>/`, and the runner separately spawns dev servers from that same directory. There is no automatic "build → run → observe → re-plan" loop.

---

## 2. Frontend X-Ray (actual code)

### 2.1 Pages (19 routes — `client/src/App.tsx:36-58`)

| Route | File | Real or chrome? |
|---|---|---|
| `/` | `pages/home.tsx` | Marketing prompt + category picker. Navigates with `?prompt=` to workspace. |
| `/workspace`, `/workspace/:id` | `pages/workspace.tsx` | **Real workspace.** Imports the big `ChatPanel`. |
| `/console` | `pages/console.tsx` | UI shell over `/sse/console`. |
| `/preview` | `pages/preview.tsx` | Uses `/sse/preview` and `/sse/console`. |
| `/publishing` | `pages/publishing.tsx` | Multi-tab UI; backend is a stub (see §6). |
| `/apps`, `/published`, `/integrations`, `/usage`, `/frameworks` | static lists | No backend wiring. |
| `/import`, `/import/{github,figma,lovable,bolt,vercel,base44}` | `pages/*-import.tsx` | UI only — no real import pipeline exists for any provider. |
| `/create` | `pages/create-project.tsx` | UI form. Backend has `POST /api/projects` (`projects.routes.ts`). |

### 2.2 The two "send" buttons in Workspace

- **`pages/workspace.tsx:78` `handleSend`** — `if (!email.trim()) return; setSent(true);` — this is the **InvitePopup** email send, NOT the agent. Don't be misled by the name.
- The **real chat input** is rendered by `<ChatPanel />` (`pages/workspace.tsx:60`), whose `handleSend` (line 788) calls `runAgent(msg)` which does the real `POST /api/run` (line 567).

### 2.3 ChatPanel `runAgent` flow (the one path that works end-to-end)

`client/src/components/ChatPanel.tsx:540-680`:

1. `POST /api/run` with `{ projectId, goal, mode }` and header `x-project-id`.
2. Server returns `{ ok, data: { runId, ... } }`.
3. Client opens `EventSource('/api/agent/stream?runId=...')`.
4. UI renders icons/colors/emojis from `TOOL_ICON_MAP` etc. (`ChatPanel.tsx:21-110`) for events with `eventType: 'agent.tool_call' | 'agent.thinking' | 'agent.message' | 'file.written' | 'diff.queued'`.
5. On `lifecycle: completed/failed/cancelled` it closes the stream and synthesizes a "checkpoint" card.

**Status: real.** This is the only happy path that drives the orchestration controller.

### 2.4 Dead / mismatched / broken client code

| Symptom | Evidence | Impact |
|---|---|---|
| `client/src/api.ts:3-9` calls `POST /api/run` with **only `{ goal }`** — no `projectId`. | Server requires both (`run.routes.ts:18-20`) → returns `400 BAD_REQUEST`. | Dead code (no caller imports `startPipeline`), but a trap if anyone wires it. |
| `client/src/sse.ts:3` connects to `/events`. | There is **no `/events` SSE handler** (only the global SSE channels in `streams/sse.ts`). | Silent reconnect loop. |
| `client/src/Dashboard.tsx` and `client/src/components/Dashboard.tsx` both export `Dashboard`. | `App.tsx` imports neither. | Naming hazard, dead code. |
| `client/src/lib/url-generator.ts:24` invents URLs like `https://solopilot-{page}-{rand}.dev`. | These domains don't resolve. UI shows fake "publish URLs". | Fake UX. |
| Tool icon maps assume 25+ tool kinds (`ChatPanel.tsx:21-110`). | The pipeline emits ≤8 distinct event types (`server/events/bus.ts:3-12`). | 90 % of icons never render. |
| 8 different EventSource endpoints opened across the app (`/sse/console`, `/sse/agent`, `/sse/files`, `/sse/file`, `/sse/preview`, `/api/agent/stream`, `/api/stream`, `/api/solopilot/stream`, `/api/solopilot/dashboard/stream`, `/api/builds/:id/logs`). | All point at the **same `bus` events**, just filtered/rebroadcast (`streams/sse.ts`). | Fan-out works but is wasteful. |

### 2.5 UI components that DO have real wiring

| Component | Endpoints |
|---|---|
| `components/file-explorer.tsx` | `/api/list-files`, `/api/read-file`, `/api/save-file`, `/api/rename-file`, `/api/delete-file` (compat) + `/sse/agent`, `/sse/console`, `/sse/files` |
| `components/PreviewPanel.tsx` | `/api/preview/{status,start,stop}`, `/api/preview/logs` |
| `components/git-panel.tsx` | `/api/git/init`, `/api/git/commit` (compat) |
| `components/SolopilotModal.tsx` etc. | `/api/solopilot/*` family in `compat.routes.ts` |
| `hooks/useTerminal.ts` | `WebSocket /ws/terminal` (real bash via `ws-server.ts`) |
| `lib/execution-client.ts` | `POST /api/solo-pilot/execute` + `WebSocket /ws/execute/:id` |

---

## 3. Backend X-Ray

### 3.1 Folder map (with file counts, real numbers)

```
main.ts                         (entry; mounts all routers)
shared/schema.ts                (7 Drizzle tables)
server/
├── agents/                     2001 files — see §4
├── db/index.ts                 1 file — Drizzle pool
├── events/bus.ts               1 file — typed EventEmitter
├── llm/openrouter.client.ts    1 file — OpenRouter chat + stream
├── orchestration/              3 files
│   ├── active-project.ts       resolveProjectId (header/query/body)
│   ├── controller.ts           runGoal → executePipeline → persist
│   └── types.ts
├── proxy/preview-proxy.ts      1 file — /preview/<id>/* proxy
├── routes/                     14 files
├── sandbox/sandbox.util.ts     1 file — path containment helpers
├── services/                   8 files (incl. shell/)
└── streams/                    2 files — sse.ts, ws-server.ts
```

The `server/.local/`, `server/.data/`, `server/agents/.data/`, `server/agents/.local/` directories are state/skill caches **inside `server/`** — **wrong placement**, should live at repo root or in `.cache/`.

### 3.2 Routes (all returning `{ ok, data?, error? }`)

| Mount | Real endpoints | Notes |
|---|---|---|
| `/api/agents` | existing pipeline router | thin |
| `/api/projects` | full CRUD | DB-backed |
| `/api/fs` | `/tree`, `/file` (GET/POST) | sandbox-scoped |
| `/api/run` | POST root, GET `:runId`, POST `:runId/cancel` | orchestration entry |
| `/api/agent/diff-queue` | apply / reject | DB-backed |
| `/api/solo-pilot` | `/execute` | spawns shell — **danger** |
| `/api/preview` | `/status`, `/start`, `/stop` | basic |
| `/api/ai/intent` | LLM intent parser → JSON | requires `OPENROUTER_API_KEY` |
| `/api/timeline`, `/api/artifacts`, `/api/folders` | DB lists | functional |
| `/api/publishing` | `/status`, `/deploy` | **STUB**: `deploy` just sets `status='published'` (`publishing.routes.ts:27-37`) |
| **runtime router** (no prefix) | `/api/run-project`, `/api/stop-project`, `/api/restart`, `/api/project-status`, `/api/tunnel-info`, `/api/runtime/logs`, `/api/packages/{list,install,uninstall,run}`, `/api/git/{status,log}`, `/api/screenshot` | REAL child-process management |
| `/preview/:projectId/*` | proxy | http-proxy-middleware + ws upgrade |
| **legacy aliases** | `/api/preview-state`, `/api/planning/generate`, `/api/agent/plan`, `/api/agent/run/{create,start,pause,resume,hard-stop}`, `/api/run/{create,start,pause,resume,hard-stop}`, `/api/file/{history,undo,conflict-check}` | Most are no-op-safe stubs that return `{ ok: true, ... }` to keep the UI from 404-ing. |
| **compat router** | 38 routes incl. `/api/list-files`, `/api/read-file`, `/api/save-file`, `/api/rename-file`, `/api/delete-file`, `/api/files/{list,create,upload,download}`, `/api/git/{init,commit}`, `/api/web/generate/{page,fullapp}`, `/api/fs/{history,timeline,commit,rollback}`, `/api/agent/queue`, `/api/patches/*`, `/api/conflict/resolve`, `/api/solopilot/*`, `/api/mobile/crash/parse` | Maps the legacy standalone-built UI to the new pipeline. Some real (file ops, git), some LLM-backed (planner), some pure stubs. |

### 3.3 Streams

`server/streams/sse.ts` (10 SSE channels):

| Channel | Source events | Used by |
|---|---|---|
| `/api/agent/stream?runId=` | `bus:agent.event` + `run.lifecycle` (filtered) | ChatPanel runAgent (real) |
| `/sse/console` | `bus:console.log` (filtered by projectId) | app-state-context, unified-grid, preview |
| `/api/solopilot/stream` | `bus:console.log` | DiffPanel, SolopilotArchitectureModal |
| `/sse/files` | `bus:file.change` | file-explorer |
| `/api/stream` | all 3 buses | useAgiStream |
| `/sse/agent` | `bus:agent.event` (also as default-event) | use-agent-ultra-stream, file-explorer |
| `/sse/preview` | `bus:console.log` + `run.lifecycle` | pages/preview |
| `/sse/file` | `bus:file.change` | BatchPanel |
| `/api/solopilot/dashboard/stream` | console + lifecycle | DashboardPanel |
| `/api/builds/:buildId/logs` | console | LogsPanel |

`server/streams/ws-server.ts` (4 WS channels):

- `/ws/terminal` → real `bash -i` in sandbox (or `process.cwd()` if no projectId — **bug, see §8**).
- `/ws/execute/:sessionId` → re-streams output of a `solo-pilot.routes.ts` exec session.
- `/ws/agent/:runId` → pushes `AgentEvent`s.
- `/ws/files/:projectId` → fs change notifications via chokidar.

### 3.4 Event bus (`server/events/bus.ts`)

Typed wrapper over Node `EventEmitter` with **4 event channels**:
`agent.event`, `console.log`, `file.change`, `run.lifecycle`. **AgentEventType** has only 8 values. The frontend tool maps assume ~30. This is the single fan-out point — REST writes, SSE/WS read. Solid design.

### 3.5 LLM (`server/llm/openrouter.client.ts`)

OpenRouter (`anthropic/claude-3.5-sonnet` default). Two functions: `chat()` and `streamChat()` (SSE parser). `getApiKey()` throws if `OPENROUTER_API_KEY` is missing. Used by: `intent.routes.ts`, `legacy-aliases.routes.ts` (planner, file conflict suggestions, undo summarization), `compat.routes.ts` (`/api/web/generate/*`, `/api/solopilot/aiResolve`, `/api/solopilot/aiMerge`, `/api/solopilot/architecture`, `/api/solopilot/autoevolve`, `/api/mobile/crash/parse`).

### 3.6 Database (`server/db/index.ts`, `shared/schema.ts`)

7 tables, all FK to `projects.id` (cascade delete). **Notably absent:** `users`, `sessions`, `auth_tokens`, `secrets`, `deployments`, `tool_calls`, `checkpoints`, `containers`. Without these you cannot honestly call this "Replit-level".

---

## 4. Agent System X-Ray

### 4.1 Inventory (real numbers)

```
.agent.ts files   : 746
orchestrator.ts   : 123
Top-level domains : 10 (api, core, data, devops, generation, infrastructure,
                       intelligence, observability, realtime, security)
Domain file counts:
  generation     619    intelligence  552    core         337
  security        94    observability  58    devops        45
  infrastructure  45    realtime       35    data          30    api  1
```

### 4.2 The pipeline (`server/agents/core/pipeline/orchestrator.ts`)

9 sequential phases:

| Phase | Function | Honest description |
|---|---|---|
| 1 safety-check | `checkSafety(input)` | string-pattern guard |
| 2 routing | `route({input, context})` | maps text → `{domain, module, agent}` |
| 3 decision | `runDecisionEngine(...)` | scoring; selects strategy + capabilities |
| 4 planning | `plan({rawInput, sessionId})` | PlannerBoss → intent + capability map |
| 5 validation | `validate({code, source, agentId})` | code metrics validator (works on user `input` text — questionable) |
| 6 generation | `dispatch({capabilities, input, max:5})` | runs ≤5 capability-matched orchestrators in parallel |
| 7 execution | bookkeeping object | **does nothing real** — just records `{executed: true, orchestratorsRan: N}` |
| 8 recovery (cond) | `recover(...)` | only if execution failed; tries to recover, doesn't re-plan |
| 9 feedback | `runFeedbackLoop(...)` | runs once, no iteration |

### 4.3 Dispatcher (`registry/dispatcher.ts`, `registry/orchestrator.registry.ts`)

- 122 entries registered via `wrap(id, domain, capabilities[], desc, loader)`.
- Each loader is `async () => (await import('...')).fn` — **dynamic import per dispatch**. Cold start cost.
- Matching: union of capability strings → `findByCapability`. Strings come from the planner + decision engine + router. If the LLM/heuristics produce capabilities not in the canonical set, **0 orchestrators match** and dispatcher logs `"no orchestrators matched — request handled by pipeline default"`. There is no default. It just returns `{dispatched: 0}`.
- Concurrency cap: 5.

### 4.4 Sample orchestrator output (real code)

`server/agents/generation/backend-gen/api-doc-generator/agents/openapi-builder.agent.ts` builds an `OpenAPISpec` object literal from `RouteMeta[]`. **It does not write files; it returns data.**

The controller then walks the entire dispatch result tree (`controller.ts:41-67 extractCodeFiles`) looking for `{path: string, content: string}` objects to persist. Most generation orchestrators produce documents, schemas, or analysis structures — **not `{path, content}` pairs** — so most of them produce nothing the file system or UI ever sees.

### 4.5 Is the agent "real"?

| Trait | Replit / Cursor / Lovable | This system |
|---|---|---|
| LLM-driven tool calls in a loop | ✅ | ❌ — LLM is called for intent / planning text only |
| Observe → re-plan | ✅ | ❌ — single pass, optional one-shot recovery |
| Tool registry exposed to LLM | ✅ (file ops, shell, web search) | ❌ — `TOOL_*_MAP` exists in UI; backend has no tool router |
| Sandboxed execution | ✅ | ✅ (`project-runner` + `.sandbox/`) |
| Streaming events to UI | ✅ | ✅ (bus + SSE/WS) |
| Diff/approval workflow | ✅ | ⚠️ Partial — `diff_queue` table + `apply/reject`; no conflict-resolution UX flow that loops back |
| Planning that feeds tool calls | ✅ | ⚠️ Planner emits a capability map; capabilities → orchestrators, not LLM tool calls |

**Verdict:** This is a **pipeline of deterministic TypeScript code generators, gated by an LLM-produced plan**. It is not an autonomous coder. The "agent" branding overstates what runs.

### 4.6 PlannerBoss / decision-engine note

These are real and well-typed. Their outputs are used (capabilities, strategy). But because the dispatcher only matches against ~120 hardcoded capability strings, the system is bottlenecked by **vocabulary mismatch** between the planner's output and the registry.

---

## 5. Control Flow (concrete)

### 5.1 "Build me X" — the only working end-to-end path

```
User types in ChatPanel
└─► ChatPanel.handleSend → runAgent(msg)                client/src/components/ChatPanel.tsx:788, 540
    └─► POST /api/run  {projectId, goal, mode}          run.routes.ts:10
        └─► orchestrator.runGoal(input)                 server/orchestration/controller.ts:111
            ├─ INSERT agent_runs                         (db)
            ├─ bus.emit('run.lifecycle', started)
            └─ executeAsync (fire-and-forget)
                └─► executePipeline(input)               server/agents/core/pipeline/orchestrator.ts:32
                    └─ 9 phases; for each phase:
                       ├─ INSERT agent_events            (db)
                       ├─ bus.emit('agent.event', ...)   ← SSE fans out to client
                       └─ extractCodeFiles(phase.data)   controller.ts:41
                          └─ writeFiles(projectId, files, runId)  controller.ts:69
                             ├─ fs.writeFile(.sandbox/<id>/<path>)
                             ├─ INSERT diff_queue (status='pending')
                             ├─ INSERT artifacts
                             └─ bus.emit('agent.event', file.written)
            └─ UPDATE agent_runs SET status, ended_at
            └─ bus.emit('run.lifecycle', completed|failed|cancelled)

ChatPanel listens on EventSource('/api/agent/stream?runId=...')
└─ Handles agent.thinking, agent.tool_call, agent.message, file.written, diff.queued
└─ Handles lifecycle.completed → close stream + render checkpoint card
```

### 5.2 "Run my project" (preview)

```
User clicks Run
└─► POST /api/run-project                                runtime.routes.ts:21
    └─► projectRunner.start(projectId, opts)             project-runner.service.ts:89
        ├─ ensureProjectDir (.sandbox/<id>/)
        ├─ findFreePort(4001..4999)
        ├─ ensureNodeModules() (npm install if missing)
        ├─ detectCommand() (npm run dev / start / static serve)
        └─ spawn(cmd, args, {cwd, env: {PORT, HOST=0.0.0.0}})
            ├─ stdout/stderr → bus.emit('console.log', ...)
            └─ on exit → status=stopped|crashed

User opens preview iframe → /preview/<projectId>/
└─► preview-proxy.ts → http-proxy-middleware → 127.0.0.1:<port>
    (with WS upgrade for HMR)
```

This path is **production-grade** and the strongest part of the codebase.

---

## 6. Issue Register (prioritized)

### 🔴 Critical

| # | Issue | Evidence | Impact | Fix |
|---|---|---|---|---|
| C1 | `/ws/terminal` opens `bash -i` in **server's process.cwd()** when the client doesn't send `projectId`. | `streams/ws-server.ts:84` (`const cwd = projectId ? ... : process.cwd();`) | Anyone reaching that WS gets a shell on the *host* repo (your code, your `.env`). | Require `projectId`. Refuse the connection without it. |
| C2 | `/api/solo-pilot/execute` accepts `command` and `args` from the body and runs with `shell: true`, no allow-list. | `routes/solo-pilot.routes.ts:36-44` | Arbitrary RCE in the sandbox path; with `shell:true` shell metacharacters work. | Drop `shell:true`, require fixed command list, OR sandbox via container. |
| C3 | Pipeline phase 7 ("execution") **does no execution**. It only records counts. The dispatched orchestrators run in phase 6 but their output isn't built/run anywhere. | `core/pipeline/orchestrator.ts` (search "PHASE 7") | The system *appears* to "execute" but doesn't. UX implies it does. | Either remove phase 7 or wire it to `projectRunner.start(projectId)` after generation succeeds. |
| C4 | Zero tests despite `package.json` claiming a test script. | `package.json:11` runs `server/agents/dependencies/tests/*.test.ts`; that path does not exist. | No regression safety. | Add real tests or delete the script. |
| C5 | `OPENROUTER_API_KEY` is required but errors are surfaced as ugly 500s; `intent.routes.ts`, `compat.routes.ts` LLM routes will all fail without warning. | `llm/openrouter.client.ts:23` | Silent feature outages. | Health endpoint should report missing keys; UI should show "AI disabled". |

### 🟠 High

| # | Issue | Evidence | Fix |
|---|---|---|---|
| H1 | Phase 6 dispatch matches by exact capability strings; planner can emit unknown capabilities → 0 orchestrators run, no error to user. | `pipeline/registry/dispatcher.ts:51-72` | Add fallback: when 0 matched, run a "general code-generation" orchestrator and surface a warning to UI. |
| H2 | `extractCodeFiles` is a generic walker that mistakes any `{path, content}` literal as a code file. | `controller.ts:41-67` | Tag generators with explicit return type or use a discriminated union. |
| H3 | `client/src/api.ts:startPipeline` is a **broken contract** for `/api/run` (sends no projectId). | client/src/api.ts | Delete file or fix signature. |
| H4 | `client/src/sse.ts` connects to `/events` which has no handler — silent reconnect storm. | client/src/sse.ts | Delete file or implement `/events`. |
| H5 | `publishing.routes.ts` `deploy` just flips `projects.status` to `'published'` — no real deploy. UI advertises a "Publishing" page. | publishing.routes.ts:27-37 | Either remove the UI affordance or wire to real deploy (Replit deploy API). |
| H6 | `import/*` pages (GitHub, Figma, Lovable, Bolt, Vercel, Base44) have **no backend** — user clicks Import and nothing happens. | client/src/pages/*-import.tsx | Either remove or implement a single git-clone import that maps to `.sandbox/<id>/`. |
| H7 | Two `Dashboard.tsx` files with identical exported names. | client/src/Dashboard.tsx + components/Dashboard.tsx | Delete one. |
| H8 | UI `TOOL_*_MAP` (~30 keys) doesn't match emitted event types (5–8). Most icons/animations never fire. | ChatPanel.tsx:21-110 vs bus.ts:3-12 | Reduce maps OR emit richer events from the controller. |
| H9 | 8+ overlapping SSE channels all fed by the same bus events; pages open multiple connections. | streams/sse.ts | Consolidate to one channel with topic filters. |
| H10 | `legacy-aliases.routes.ts` has many `{ ok: true }` no-op stubs (run/start/pause/resume/hard-stop, conflict-check). | legacy-aliases.routes.ts:96-138, 75-78 | Real implementations or remove the UI buttons. |

### 🟡 Medium

| # | Issue | Evidence | Fix |
|---|---|---|---|
| M1 | 122 dynamic `await import()` per request can stall first dispatch; no warm-up. | orchestrator.registry.ts (`wrap` loader) | Pre-warm popular orchestrators on boot. |
| M2 | `bus` has `setMaxListeners(0)` — easy to leak listeners (each SSE/WS adds one). | events/bus.ts:48 | Add per-channel listener counts in a `/health` page. |
| M3 | `.sandbox` directory is created lazily but never cleaned; orphan child processes survive crashes (only SIGTERM handler). | project-runner.service.ts:266-276 | Add periodic reaper + project-status reconciliation on boot. |
| M4 | `multer` upload (compat) accepts 50MB × 20 files with no MIME / extension allow-list. | compat.routes.ts:21-23 | Restrict to known types; scan for executables. |
| M5 | `pages/preview.tsx` hardcodes a remote `subdomain`-style host (`url-generator.ts`). | client/src/lib/url-generator.ts | Remove fake URL generator; show real `/preview/<id>/`. |
| M6 | `ChatPanel.tsx` is 1147 lines and `CenterPanel.tsx` is 783 lines (god components). | wc -l output | Decompose into hooks + smaller render units. |
| M7 | `attachWebSocketServer` imports `getExecSession` from `solo-pilot.routes.ts` — module-level cycle risk. | streams/ws-server.ts:7 | Move `sessions` map to its own module. |
| M8 | Drizzle migrations live in `.data/drizzle/` — generally fine but not in `.gitignore`'s reach explicitly; check that schema migrations are committed. | drizzle.config.ts:5 | Confirm `.data/drizzle/` is committed; document in `replit.md`. |

### 🟢 Low

| # | Issue | Evidence |
|---|---|---|
| L1 | `server/.local/` and `server/.data/` should not be inside `server/`. |
| L2 | `client/src/PRODUCT_MODE.ts` toggles a constant; never imported anywhere meaningful. |
| L3 | Some icons in `lucide-react` imported but never used in `pages/workspace.tsx` (e.g. `Brain`, `FileCode`, `Trash2` etc. listed as part of a giant import block). |
| L4 | `secrets.service.ts` exists in services but no route exposes it. |

---

## 7. Missing systems (vs. Replit-level platform)

| Missing | What you'd need |
|---|---|
| **Authentication & users** | `users`, `sessions` tables; sign-in flow; route guards |
| **Real deployments** | Build pipeline → image / static bundle → public domain; rollback; logs viewer wired to deploy logs (currently uses `console_logs`) |
| **Secrets manager (UI + API)** | `secrets` table (encrypted), modal in workspace, env injector at child-spawn time (project-runner currently inherits `process.env` only) |
| **Object storage** | for screenshots, file uploads, build artifacts |
| **Real LLM tool-calling agent loop** | OpenRouter / Anthropic tool-use; tool registry (file.read, file.write, shell.exec, search, install, restart) the LLM can invoke; observe → re-plan loop with budget |
| **Conflict / 3-way diff workflow that re-runs on apply failure** | Currently `diff_queue` apply just writes; no merge UI loop |
| **Checkpoints / snapshots** | UI shows checkpoint cards; backend has no snapshot table |
| **Real preview public URL** | currently `/preview/<id>/` requires the user to be on the dev domain; tunnels (e.g. ngrok-like) needed for external access |
| **Project import** | All 6 import pages are UI-only |
| **Resource quotas / process supervisor** | `project-runner` has no CPU/RAM/wall-clock limits per child |
| **Audit log / RBAC** | None |

---

## 8. Data & state flow

### 8.1 Data origin → sink

```
User input  ─► ChatPanel state (memory)
            ─► /api/run body (HTTP)
            ─► orchestrator.runGoal (memory)
            ─► agent_runs row (Postgres)
            ─► executePipeline phases
               ├─ agent_events row per phase (Postgres)
               ├─ bus events (in-process EventEmitter)
               └─ extractCodeFiles → fs writes (.sandbox/<id>/) + diff_queue + artifacts (Postgres)
            ─► SSE/WS to UI (bus subscribers)

Project run ─► spawn child (memory: processes Map)
            ─► child stdio → bus.console.log (in-process)
            ─► /sse/console subscribers + (NOT) console_logs DB
                (bus events are NOT persisted to console_logs — schema exists, no writer.)
```

### 8.2 In-memory state holders (not persisted across restarts)

| Holder | Where | Cleared on restart |
|---|---|---|
| `runs` map | `controller.ts:11` | yes |
| `cancellations` set | `controller.ts:12` | yes |
| `processes` map | `project-runner.service.ts:25` | yes |
| `usedPorts` set | `project-runner.service.ts:26` | yes |
| `sessions` map (solo-pilot) | `solo-pilot.routes.ts:16` | yes |
| `proxyCache` map | `preview-proxy.ts:17` | yes |

**No reconciliation on boot.** If the API restarts mid-run, all running children become zombies (no PID tracking in DB).

### 8.3 Process / port map (in real time)

- API server: `3001` (`main.ts:24`)
- Vite dev: `5000` (`vite.config.ts:16`)
- Project runners: `4001-4999` (`project-runner.service.ts:22-23`)

---

## 9. API contract layer (verified)

Every server route returns either `{ ok: true, data: ... }` or `{ ok: false, error: { code, message } }`. **Most client code does NOT check `j.ok`** — it assumes 2xx == success. Examples: `client/src/components/file-explorer.tsx:31`, `PreviewPanel.tsx:10`, `BatchPanel.tsx`. This causes silent partial-success bugs.

Mismatches:

| Endpoint | Client sends | Server expects |
|---|---|---|
| `POST /api/run` | `client/src/api.ts`: `{ goal }` only | `{ projectId, goal }` (400 otherwise) |
| `GET /api/list-files` | `?projectPath=` | uses `resolveProjectId(req)` → reads `projectId` from header/query/body. `projectPath` isn't read, falls back to default project |
| `EventSource('/events')` | client/src/sse.ts | no handler |
| `POST /api/agent/diff-queue/apply` | UI assumes a list of patches | server applies one row by id |

---

## 10. Tool system analysis

There is **no backend tool router**. There is no module that exposes `{name, schema, run}` to the LLM. The "tools" the UI animates (`shell.exec`, `file.write`, `package.install`, etc.) are emitted as `agent.event` payloads from inside orchestrators, not invoked by the LLM.

What exists that *could* be tools:

| Capability | Implementation |
|---|---|
| `file.read/write/delete/rename` | `compat.routes.ts` + `fs.routes.ts` |
| `shell.exec` | `solo-pilot.routes.ts` + `ws-server.ts` (terminal) |
| `package.install/uninstall/list/run` | `package-manager.service.ts` + `runtime.routes.ts` |
| `git.status/log/init/commit` | `git.service.ts` + runtime/compat |
| `screenshot.capture` | `runtime.routes.ts /api/screenshot` |
| `server.start/stop/restart` | `project-runner.service.ts` |
| `db.push` | none |
| `secrets.read/write` | `secrets.service.ts` exists but no route |

To become Replit-grade, wrap all of these into a tool registry + Anthropic tool-use loop.

---

## 11. Performance / bottleneck analysis

1. **Cold-start dispatch**: 122 lazy `import()` calls (`registry/orchestrator.registry.ts`); first dispatch on each module pays a few hundred ms.
2. **Best-effort serial DB writes** in `controller.emit`: every event = 1 INSERT; for a 9-phase run with sub-events you can issue 30+ inserts per goal. Use a buffered writer or COPY.
3. **`extractCodeFiles` walks the entire phase result tree** (recursively) for every phase — fine for small trees but scales O(N).
4. **8+ EventSource connections per workspace tab** all consume their own keep-alives.
5. **`bus.setMaxListeners(0)`** masks listener leaks.
6. **`chokidar` per-project watcher** in `/ws/files/:projectId` — unbounded if many projects open.

---

## 12. Security / sandbox analysis

| Surface | Status |
|---|---|
| `sandbox.util.ts:resolveInSandbox` | ✅ Correct path containment check (`startsWith(root + sep)`) |
| `/ws/terminal` no-projectId branch | ❌ Critical (see C1) |
| `/api/solo-pilot/execute` shell:true | ❌ Critical (see C2) |
| Multer uploads | ⚠️ No type filter (M4) |
| `/api/files/:path(*)` | OK — also goes through `resolveInSandbox` |
| `.sandbox/<id>/.env` | not validated; any orchestrator that writes a `.env` puts it in the child's CWD; the runner doesn't filter it |
| CORS / CSRF | None set; intra-domain only via Vite proxy. OK for single-origin dev. |

---

## 13. Final blueprint — what the structure SHOULD be

```
project-root/
├── apps/
│   ├── web/          ← client/ (rename + own package.json)
│   └── api/          ← main.ts + server/* (rename + own package.json)
├── packages/
│   ├── shared/       ← shared/schema.ts + DTOs + zod schemas
│   ├── llm/          ← llm/openrouter.client.ts + tool registry
│   ├── sandbox/      ← project-runner, package-mgr, git, sandbox util
│   └── orchestration/← controller + pipeline (current server/agents/core/pipeline)
├── agents/           ← collapse server/agents/* domains here
│   ├── core/, generation/, intelligence/, …
│   └── (ONE registry file with all wraps; one capability normalizer)
├── tools/            ← LLM-callable tools (file, shell, pkg, git, screenshot, search, secrets)
├── tests/
│   ├── unit/ integration/ e2e/
└── docs/
```

Other refactors:

- Move all `*-import.tsx` pages behind feature flags or delete.
- Replace `legacy-aliases.routes.ts` + `compat.routes.ts` with a single `v1` adapter that's clearly versioned and documented.
- Persist child process metadata (`pid, port, status`) in a `runtime_processes` table for crash-safe boot.
- Replace fake `url-generator.ts` with the real `${REPLIT_DEV_DOMAIN}/preview/<id>/`.
- Consolidate SSE to **one** channel `/api/stream?topics=...` with server-side filtering.
- Add a tool router and switch the agent loop to **Anthropic tool-use** so the LLM actually drives.
- Add tests; delete the stale npm script if you won't.

---

## 14. What works today (don't break these)

- ✅ `POST /api/run-project` → `spawn` → `/preview/<id>/*` proxy chain (real and clean)
- ✅ `/ws/terminal` (when `projectId` is provided)
- ✅ `/api/packages/*` real npm operations
- ✅ `/api/git/*` real git operations
- ✅ Drizzle schema + Postgres connection
- ✅ `bus` + SSE/WS plumbing (just consolidate channels)
- ✅ ChatPanel ↔ `/api/run` ↔ `/api/agent/stream` end-to-end
- ✅ Sandbox path containment

---

## 15. Honest summary

This codebase has the **plumbing** for a Replit-clone (sandboxed child processes, port allocation, preview proxy, event bus, SSE/WS, Postgres) and a **massive but largely deterministic** "agent" forest (746 .agent.ts files producing data structures). What it does **not** have is a real LLM-driven autonomous coding loop: there is no tool registry, no observe-and-replan iteration, and the "execution" phase is a no-op that only counts orchestrators. The frontend is wide (19 pages, 185 files) with many surfaces (publishing, imports, dashboards) that are pure UI without backend wiring.

**To turn this into a real platform:**
1. Fix the two critical security holes (C1, C2).
2. Wire phase 7 to `projectRunner.start` so generated code actually runs.
3. Build a tool registry and switch to LLM tool-use for the agent loop.
4. Implement (or delete) all stub UIs (publishing, imports, fake URLs).
5. Add `users`, `secrets`, `deployments`, `runtime_processes` tables.
6. Add tests.

Everything else (the 746 agent files, 122 orchestrators, 19 pages, 38 compat endpoints) is supporting tissue around those six items.
