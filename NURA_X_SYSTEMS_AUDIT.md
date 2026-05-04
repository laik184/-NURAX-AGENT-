# NURA X — Systems Audit & Project Documentation

> Generated: May 2026 | Auditor: Replit Agent | Codebase: 1,937 TypeScript files

---

## 1. Executive Summary

### Current State of Frontend UI/UX

The frontend is a React + Vite application with **20 pages** and **80+ components**. The UI shell is largely complete — navigation, sidebar, workspace layout, and design system (Shadcn/Radix) are all in place. However, several pages consume **hardcoded mock data** rather than live API calls (home page recent projects, dashboard, usage stats), and key agent output panels have presentation logic without a guaranteed live data feed behind them.

**Estimated frontend completeness: ~65%**

### Current State of Backend

The backend is a production-grade Express.js monolith with **1,937 TypeScript files** across 9 agent domains. The core pipeline — agent loop, orchestration controller, SSE/WebSocket streams, sandbox execution, project runner, file system, git, package manager, and diff queue — is **fully implemented and wired**. The main runtime gap is the `OPENROUTER_API_KEY` environment variable: without it, every agent loop call throws immediately and no AI output is produced.

**Estimated backend completeness: ~80%**

### Overall System Health

| Area | Status |
|---|---|
| Server starts and serves | ✅ Running |
| Database connected (PostgreSQL) | ✅ Schema pushed |
| Project CRUD | ✅ Working |
| Agent loop architecture | ✅ Implemented |
| LLM key present | ❌ Missing (`OPENROUTER_API_KEY` not set) |
| Authentication | ❌ Not implemented |
| Frontend ↔ backend data binding | ⚠️ Partial (many pages still use mock data) |
| CI/CD | ❌ Not configured |
| Tests | ⚠️ Framework wired, no meaningful test coverage |

---

## 2. Architectural Overview

### High-Level Diagram

```
Browser (React + Vite, port 5000)
    │
    ├─ HTTP /api/*  ─────────────────────────────────────────┐
    ├─ SSE  /api/agent/stream, /sse/console, /sse/files      │
    └─ WS   /ws/terminal, /ws/execute/:id, /ws/agent/:id     │
                                                             ▼
                         Express Server (port 3001)
                                │
               ┌────────────────┼────────────────┐
               ▼                ▼                ▼
        Route Layer       Orchestration     Event Bus (in-process)
    (20+ routers)        Controller            TypedBus
               │                │                │
               ▼                ▼                ▼
        Services          Agent Loop         SSE/WS streams
    - project-runner    (ReAct loop,          to client
    - package-manager    25 steps max)
    - git.service
    - filesystem
               │                │
               ▼                ▼
        .sandbox/<id>/      OpenRouter API
        (per-project fs)    (LLM calls)
               │
               ▼
        PostgreSQL (Drizzle ORM)
        Tables: projects, agent_runs, agent_events,
                chat_messages, artifacts, diff_queue, console_logs
```

### Folder Structure

```
/
├── main.ts                  # Express entry — mounts all routers + WS
├── vite.config.ts           # Vite dev server (port 5000, proxies /api → :3001)
├── drizzle.config.ts        # Points to shared/schema.ts, PostgreSQL
├── shared/
│   └── schema.ts            # Single source of truth for all DB types
├── client/
│   └── src/
│       ├── App.tsx           # Router + providers shell
│       ├── pages/            # 20 route-level page components
│       ├── components/       # 80+ reusable UI components
│       │   ├── ui/           # Shadcn primitives (accordion, button, etc.)
│       │   ├── publishing/   # Deploy-specific panels
│       │   └── tab-views/    # AgentView, ConsoleView, PreviewView, PublishView
│       ├── context/          # AppStateContext, ImportModalContext
│       ├── hooks/            # use-mobile, useAgiStream, etc.
│       └── lib/              # queryClient, utils
└── server/
    ├── agents/               # 1,900+ TS files across 9 domains
    │   ├── core/             # LLM routing, memory, pipeline registry, recovery
    │   ├── generation/       # Code generators (backend, frontend, DB, mobile)
    │   ├── intelligence/     # Architecture analysis, decision engines, planning
    │   ├── infrastructure/   # Deploy runners, git ops
    │   ├── devops/           # CI/CD, env validation
    │   ├── observability/    # Health, logging, metrics
    │   ├── security/         # MFA, OAuth2, rate limiting
    │   ├── realtime/         # WebSocket generators
    │   └── data/             # Redis, query optimizers
    ├── db/index.ts           # Drizzle pool + client
    ├── events/bus.ts         # In-process TypedBus (EventEmitter)
    ├── llm/                  # OpenRouter client (chat, streamChat, chatWithTools)
    ├── orchestration/        # controller, agent-loop, pipeline-runner, runs, types
    ├── proxy/                # preview-proxy (http-proxy-middleware)
    ├── routes/               # 20+ Express routers
    ├── sandbox/              # sandbox.util.ts — path scoping per project
    ├── services/             # project-runner, package-manager, git, filesystem
    ├── streams/              # sse.ts, ws-server.ts
    └── tools/                # 13 sandbox tools the LLM can call
```

### Data Models

```typescript
// shared/schema.ts — all 7 tables

projects         { id, name, description, framework, sandboxPath, status, createdAt, updatedAt }
chat_messages    { id, projectId→projects, role, content, toolCalls(jsonb), createdAt }
agent_runs       { id(varchar), projectId→projects, goal, status, startedAt, endedAt, result(jsonb) }
agent_events     { id, runId→agent_runs, phase, agentName, eventType, payload(jsonb), ts }
artifacts        { id, projectId→projects, kind, path, meta(jsonb), createdAt }
diff_queue       { id, projectId→projects, filePath, oldContent, newContent, status, createdAt }
console_logs     { id, projectId→projects, stream, line, ts }
```

### Core API Contracts

| Method | Path | Purpose | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/projects` | List all projects | — | `{ ok, data: Project[] }` |
| `POST` | `/api/projects` | Create project | `{ name, description?, framework? }` | `{ ok, data: Project }` |
| `GET` | `/api/projects/:id` | Get project | — | `{ ok, data: Project }` |
| `PATCH` | `/api/projects/:id` | Update project | `{ name?, status?, ... }` | `{ ok, data: Project }` |
| `DELETE` | `/api/projects/:id` | Delete project | — | `{ ok, data: { id } }` |
| `POST` | `/api/run` | Start agent run | `{ projectId, goal, mode? }` | `{ ok, data: RunHandle }` |
| `GET` | `/api/run/:runId` | Get run + events | — | `{ ok, data: { run, events[] } }` |
| `POST` | `/api/run/:runId/cancel` | Cancel run | — | `{ ok, data: { cancelled } }` |
| `GET` | `/api/agent/stream` | SSE agent events | `?runId=` | `event: agent \| lifecycle` |
| `GET` | `/sse/console` | SSE console logs | `?projectId=` | `event: console` |
| `POST` | `/api/run-project` | Start sandbox process | `{ command?, port? }` | `{ ok, port, url }` |
| `POST` | `/api/stop-project` | Stop sandbox process | — | `{ ok, status }` |
| `GET` | `/api/project-status` | Process status | `?projectId=` | `{ ok, status, port }` |
| `GET` | `/api/runtime/logs` | Process stdout/stderr | `?limit=` | `{ ok, lines[] }` |
| `GET` | `/api/packages/list` | npm list | `?projectId=` | `{ ok, data }` |
| `POST` | `/api/packages/install` | npm install | `{ packages[] }` | `{ ok }` |
| `GET` | `/api/fs/tree` | Directory tree | `?projectId=` | `{ ok, data: tree }` |
| `GET` | `/api/fs/file` | Read file | `?projectId=&path=` | `{ ok, content }` |
| `POST` | `/api/fs/file` | Write file | `{ projectId, path, content }` | `{ ok }` |
| `GET` | `/api/agents/registry` | All agent orchestrators | — | `{ orchestrators[] }` |
| `POST` | `/api/agents/run` | Legacy pipeline run | `{ input }` | `{ success, phases[] }` |
| `WS` | `/ws/terminal` | Interactive shell | `?projectId=` | Bidirectional stdin/stdout |
| `WS` | `/ws/agent/:runId` | Agent event stream | — | JSON events |

---

## 3. Frontend Deep Dive

### Key Pages and Flows

| Route | Page | Status | Notes |
|---|---|---|---|
| `/` | `home.tsx` | ⚠️ Partial | Prompt input works (navigates to workspace). Recent projects list is **hardcoded mock data**. |
| `/workspace` `/workspace/:id` | `workspace.tsx` | ✅ Core working | Full IDE layout: chat panel, code editor, terminal, preview tabs, agent feed. |
| `/preview` | `preview.tsx` | ✅ Working | Device emulator, dev-tools panel, SSE-driven overlay. |
| `/publishing` | `publishing.tsx` | ⚠️ Partial | UI complete; deploy pipeline partially stubbed. |
| `/apps` | `apps.tsx` | ⚠️ Mock | Shows project list UI — likely not yet wired to `/api/projects`. |
| `/import/*` | 6 import pages | ⚠️ UI only | GitHub/Figma/Lovable/Bolt/Vercel/Base44 import flows — backend not fully wired. |
| `/create` | `create-project.tsx` | ✅ Functional | POSTs to `/api/projects`. |
| `/console` | `console.tsx` | ⚠️ Partial | SSE console feed present; filtering UI may be mock. |
| `/frameworks` | `developer-frameworks.tsx` | ⚠️ Static | Informational/marketing page, no live data. |
| `/integrations` | `integrations.tsx` | ⚠️ Static | UI shell, no integration backend wired. |
| `/usage` | `usage.tsx` | ❌ Mock | Usage stats are entirely hardcoded. |
| `/published` | `published-apps.tsx` | ⚠️ Partial | List view only, no live deploy status. |
| 404 | `not-found.tsx` | ✅ Done | Simple fallback. |

### UI Components → Backend Call Mapping

| Component | Backend Call | Notes |
|---|---|---|
| `ChatPanel` | `POST /api/run`, `GET /api/agent/stream` (SSE) | Main agent trigger |
| `AgentActionFeed` | `GET /api/agent/stream` | Reads SSE event stream |
| `ConsolePanel` | `GET /sse/console` | SSE stdout/stderr |
| `Terminal` | `WS /ws/terminal` | Bidirectional shell |
| `FileTreePanel` / `file-explorer` | `GET /api/fs/tree`, `GET/POST /api/fs/file` | Sandbox file system |
| `DiffPanel` / `diff-queue-panel` | `GET /api/agent/diff-queue`, `POST /api/agent/diff-queue/apply` | Apply/reject file diffs |
| `ArtifactsPanel` | `GET /api/artifacts?projectId=` | Generated artifacts |
| `TimelinePanel` | `GET /api/timeline?projectId=` | Run history |
| `PreviewPanel` | `GET /api/project-status`, `/preview/:id/*` proxy | Iframe proxied to sandbox port |
| `PublishingPanel` | `GET /api/publishing/status`, `POST /api/publishing/deploy` | Deploy pipeline |
| `GitPanel` | `GET /api/git/status`, `GET /api/git/log` | Real git in sandbox |
| `DatabasePanel` | No backend route | ❌ Not wired |
| `Home recentProjects` | ❌ None | Hardcoded mock |
| `Usage page stats` | ❌ None | Hardcoded mock |

### Frontend Blockers

1. **`OPENROUTER_API_KEY` not set** — `ChatPanel` submit silently fails at the agent loop level; no visible error surfaces to the user.
2. **Mock data on Home page** — `recentProjects` are hardcoded; should call `GET /api/projects`.
3. **No error boundaries** — LLM failures propagate as silent empty states rather than user-readable errors.
4. **No authentication** — any user hitting the URL can create projects and run agents.

---

## 4. Backend Deep Dive

### Core Services

| Service | File | What It Does |
|---|---|---|
| **Project Runner** | `services/project-runner.service.ts` | Spawns `child_process` per project, allocates ports 4001–4999, auto-detects `npm run dev`, auto-runs `npm install`, streams stdout/stderr to bus |
| **Package Manager** | `services/package-manager.service.ts` | Real `npm install/uninstall/list/run`, every line streamed to `/sse/console` |
| **Git Service** | `services/git.service.ts` | Real `git init/commit/status/log` against system git binary in sandbox |
| **Filesystem Service** | `services/filesystem.service.ts` | Sandboxed file read/write/delete/tree ops |
| **Orchestration Controller** | `orchestration/controller.ts` | Single entry for `/api/run`. Creates DB row, fires async agent loop, broadcasts via event bus |
| **Agent Loop** | `orchestration/agent-loop.ts` | ReAct loop: system prompt → `chatWithTools` → execute tools → repeat → `task_complete`. 25-step cap. |
| **Event Bus** | `events/bus.ts` | In-process `EventEmitter` typed to 4 event channels: `agent.event`, `console.log`, `file.change`, `run.lifecycle` |
| **LLM Client** | `llm/openrouter.client.ts` | Wraps OpenRouter. Exports `chat()`, `streamChat()`, `chatWithTools()`. Default model: `openai/gpt-oss-120b:free` |
| **Preview Proxy** | `proxy/preview-proxy.ts` | `/preview/<projectId>/*` → child process port via `http-proxy-middleware`, WS upgrades supported |
| **Sandbox Util** | `sandbox/sandbox.util.ts` | All FS ops scoped to `.sandbox/<projectId>/`; path traversal blocked |

### 13 LLM Tools (sandbox-scoped)

| Tool | Purpose |
|---|---|
| `file_list` | Directory tree of project sandbox |
| `file_read` | Read file content |
| `file_write` | Create or overwrite a file (creates parent dirs) |
| `file_delete` | Delete file or directory |
| `shell_exec` | Run allow-listed binaries only; no shell metacharacters |
| `package_install` | Run `npm install` with specified packages |
| `server_start` | Start the dev server; returns preview URL |
| `server_stop` | Stop the dev server |
| `server_restart` | Restart dev server |
| `server_logs` | Fetch recent stdout/stderr from running server |
| `detect_missing_packages` | Scan logs for `Cannot find module X` errors |
| `agent_message` | Send user-visible status message |
| `agent_question` | Pause loop and ask user a clarifying question |
| `task_complete` | Signal goal is done; ends the loop |

### Authentication

**None currently implemented.** The backend has no middleware to verify identity. Any caller with network access can create projects, trigger agent runs, and execute arbitrary commands in sandboxes. The `security/` agent domain contains generators for auth patterns but none are applied to the routes themselves.

### Error Handling

- All routes return `{ ok: false, error: { code, message } }` on failure — consistent contract.
- The agent loop catches LLM errors and emits them as `agent.message` events.
- No global Express error handler registered (an unhandled throw will return Express's default HTML error page instead of JSON).

### Instrumentation

- Event bus emits all agent steps — any SSE subscriber gets full observability.
- No Prometheus metrics, no OpenTelemetry tracing wired into the running server (the `observability/` agent domain generates code for these but they are not applied to `main.ts`).

### Endpoints: Implemented vs Pending

| Status | Endpoints |
|---|---|
| ✅ Fully working | All `/api/projects/*`, `/api/run/*`, `/api/fs/*`, `/api/run-project`, `/api/stop-project`, `/api/restart`, `/api/project-status`, `/api/runtime/logs`, `/api/packages/*`, `/api/git/*`, `/api/agent/stream` (SSE), `/ws/terminal`, `/ws/agent/:id`, `/ws/execute/:id`, `/ws/files/:id` |
| ⚠️ Partially wired | `/api/publishing/*` (UI exists, deploy pipeline partially stubbed), `/api/solo-pilot/*` (exec works, streaming partial), `/api/ai/intent` (LLM-backed, needs key) |
| ❌ Not wired | Database panel endpoint, usage stats endpoint, integrations backend |

### Typical Latency Expectations

| Operation | Expected Latency |
|---|---|
| Project CRUD | < 50ms |
| `npm install` (small) | 5–30s |
| Agent loop first token | 2–8s (OpenRouter cold start) |
| Agent loop full task | 30s–5min (depends on steps) |
| Sandbox process start | 2–15s |
| File read/write | < 20ms |

---

## 5. Dev Workflow & Repository Guidance

### Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Set required environment variables
#    DATABASE_URL is pre-set in Replit PostgreSQL
#    OPENROUTER_API_KEY must be added via Replit Secrets

# 3. Push DB schema
npx drizzle-kit push

# 4. Start both servers (API on :3001, Vite on :5000)
npm run dev
```

### Available npm Scripts

| Script | What it runs |
|---|---|
| `npm run dev` | `concurrently` → `tsx watch main.ts` + `vite` |
| `npm run dev:api` | Backend only (`tsx watch main.ts`) |
| `npm run dev:web` | Frontend only (`vite`) |
| `npm start` | Production backend (`tsx main.ts`) |
| `npm run build` | `vite build` (frontend only) |
| `npm test` | Runs agent dependency unit tests in `server/agents/dependencies/tests/` |

### Environment Variables

| Variable | Required | Current State | Where to set |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | ✅ Set | Replit PostgreSQL (pre-set) |
| `OPENROUTER_API_KEY` | ✅ Yes | ❌ Missing | Replit Secrets — add immediately |
| `LLM_MODEL` | Optional | Uses default | Override default (`openai/gpt-oss-120b:free`) |
| `LLM_BASE_URL` | Optional | Uses default | Override OpenRouter base URL |
| `AGENT_PROJECT_ROOT` | Optional | Uses default | Override sandbox root (default: `.sandbox/`) |
| `PORT` | Optional | Uses default | Backend port (default: 3001) |

### Branching & CI/CD

- **No branching strategy or CI/CD pipeline is configured.** There is no `.github/workflows/`, no `Dockerfile` at root, no `Makefile`.
- Currently all development happens directly on the main branch in this Replit environment.
- Recommended: add GitHub Actions with steps: `lint → typecheck → test → build`.

---

## 6. Common Blockers & Root-Cause Hypotheses

### Why the Agentic AI Isn't Producing Output

| # | Root Cause | Evidence | Impact |
|---|---|---|---|
| **1** | `OPENROUTER_API_KEY` not set | `getApiKey()` throws `"OPENROUTER_API_KEY is not set"` before any HTTP request is made | **All agent runs fail immediately. This is the #1 blocker.** |
| **2** | No error surfaced to UI | Agent loop emits `agent.message` on error, but if the SSE connection isn't open or the frontend isn't subscribed to that run's stream, the user sees nothing | User thinks the agent is silent/broken |
| **3** | Frontend mock data on Home | `recentProjects` is hardcoded → new projects created via API don't appear on the home page | User can't navigate to their own projects from home |
| **4** | No auth = no project context | Without a logged-in user, `x-project-id` must be manually passed; the `resolveProjectId` utility lazy-creates projects but the UI doesn't always pass a project ID | Agent runs get orphaned from the workspace context |
| **5** | Legacy pipeline path (`/api/agents/run`) | Still available but the legacy pipeline agents are not wired to a real LLM — they return rule-based outputs. If the frontend accidentally calls this instead of `/api/run`, responses look incomplete | Confusing dual-path behavior |
| **6** | Free-tier model limits | Default model `openai/gpt-oss-120b:free` has rate limits on OpenRouter; tool-calling reliability varies by model | Intermittent failures even with the key set |

---

## 7. Actionable Remediation Plan

### Short-Term (Next 2 Weeks) — Critical Blockers

| Priority | Task | Notes |
|---|---|---|
| 🔴 P0 | **Add `OPENROUTER_API_KEY` to Replit Secrets** | Single action that unblocks all agent functionality |
| 🔴 P0 | **Wire Home page to `GET /api/projects`** | Replace hardcoded `recentProjects` with `useQuery(['/api/projects'])` |
| 🔴 P0 | **Add global Express error handler** | Return `{ ok: false, error }` JSON on unhandled throws |
| 🟠 P1 | **Surface LLM errors to the UI** | If SSE delivers `agent.message` with `eventType === "error"`, show a toast or inline error |
| 🟠 P1 | **Wire `GET /api/projects` to Apps page** | Replace mock data in `apps.tsx` |
| 🟠 P1 | **Wire Usage page to real run metrics** | `GET /api/agents/metrics` already returns `totalRuns, successCount, avgDurationMs` |
| 🟡 P2 | **Add basic authentication** | Even a simple API key or Replit Auth middleware to gate project creation and run endpoints |
| 🟡 P2 | **Fix `drizzle-zod` insert schemas** | Add `createInsertSchema` exports so forms can validate against the DB schema |
| 🟡 P2 | **Validate project ID is passed with every agent run** | Ensure `workspace.tsx` always sends `projectId` to `POST /api/run` |

### Long-Term (1–3 Months) — Architectural Improvements

| Area | Task |
|---|---|
| **Auth** | Implement Replit Auth or a session-based auth layer with per-user project isolation |
| **Model quality** | Upgrade from free-tier model to `anthropic/claude-3.5-sonnet` for reliable tool-calling |
| **Observability** | Wire `server/agents/observability/` outputs into `main.ts`; expose `/metrics` (Prometheus format) |
| **Test coverage** | Write integration tests for: agent loop happy path, sandbox isolation, project runner lifecycle |
| **CI/CD** | Add GitHub Actions: lint → type-check → test → build on every push |
| **Error recovery** | Implement the `recovery/` domain agents into the agent loop to auto-retry failed steps |
| **Streaming persistence** | Persist `console_logs` from the bus to the DB (the table exists, the write is not wired) |
| **File watching** | `chokidar` is imported in `ws-server.ts` — complete the `sse/files` file-watching wire-up |
| **Sandbox cleanup** | Add a scheduled job to remove `.sandbox/<id>/` directories for deleted projects |
| **Multi-user** | Project sandboxes are currently shared-memory; add user-scoped namespacing |

---

## 8. Deliverables Checklist

### Architecture Diagram

```
[ Browser ] ──HTTP/SSE/WS──> [ Express :3001 ]
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
     [ Route Layer ]     [ Orchestration + Agent Loop ]  [ Event Bus ]
     20+ routers           controller.ts → agent-loop.ts   bus.ts
              │                      │                      │
              ▼                      ▼                      ▼
    [ Services ]           [ OpenRouter LLM API ]     [ SSE/WS push ]
    project-runner          chatWithTools()             to browser
    package-manager
    git / filesystem
              │
              ▼
    [ .sandbox/<id>/ ]      [ PostgreSQL ]
    child process            7 tables via Drizzle ORM
```

### Example API Spec — Agent Run Flow

```
POST /api/run
Body:  { "projectId": 1, "goal": "Add a login page with email + password" }
Response: { "ok": true, "data": { "runId": "run-abc123", "status": "running" } }

GET /api/agent/stream?runId=run-abc123   (SSE)
← event: agent     data: { eventType: "agent.thinking", payload: { text: "Step 1: thinking…" } }
← event: agent     data: { eventType: "agent.tool_call", payload: { name: "file_write", args: {...} } }
← event: lifecycle data: { status: "completed" }

GET /api/run/run-abc123
Response: { "ok": true, "data": { "run": { status: "completed", result: {...} }, "events": [...] } }
```

### Sample Code — Triggering an Agent Run from the Frontend

```typescript
// In ChatPanel.tsx or workspace.tsx
const mutation = useMutation({
  mutationFn: (goal: string) =>
    apiRequest("POST", "/api/run", { projectId, goal }),
  onSuccess: (data) => {
    const runId = data.data.runId;

    // Subscribe to SSE stream for live events
    const es = new EventSource(`/api/agent/stream?runId=${runId}`);

    es.addEventListener("agent", (e) => {
      const event = JSON.parse(e.data);
      // Surface tool calls and messages to AgentActionFeed
    });

    es.addEventListener("lifecycle", (e) => {
      const { status } = JSON.parse(e.data);
      if (status === "completed" || status === "failed") {
        es.close();
        queryClient.invalidateQueries({ queryKey: ['/api/run', runId] });
      }
    });
  },
});
```

### Sample Code — Reading the File Tree

```typescript
// In FileTreePanel.tsx
const { data, isLoading } = useQuery({
  queryKey: ['/api/fs/tree', projectId],
  enabled: !!projectId,
  refetchInterval: 5000,
});

// Response shape: { ok: true, data: { name, path, children: [...] } }
```

### Sample Code — Global Express Error Handler (missing — add to main.ts)

```typescript
// Add at the bottom of main.ts, after all router mounts
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[nura-x] Unhandled error:', err.message);
  res.status(500).json({
    ok: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
  });
});
```

---

## 9. Open Questions to Resolve

Before proceeding with further development, the following decisions should be made:

1. **LLM Key**: Do you want to use OpenRouter with your own API key, or switch to a different provider (Anthropic direct, OpenAI direct)? This unblocks everything immediately.

2. **Auth**: Should this be a single-user tool (no auth needed) or multi-user (needs user accounts + project isolation per user)?

3. **Import flows**: Are the GitHub/Figma/Lovable/Bolt import pages intended to actually clone remote repos, or are they placeholders for a future paid tier?

4. **Deploy pipeline**: The `publishing/` UI exists — is the actual deployment target Replit deployments, Docker, or something else?

5. **Model preference**: Stay on the free `openai/gpt-oss-120b:free` model, or upgrade to `anthropic/claude-3.5-sonnet` for more reliable tool-calling?

6. **Sandbox persistence**: Should `.sandbox/<id>/` directories persist across server restarts, or should they be ephemeral per session?

---

*End of report. The single highest-leverage action right now is adding the `OPENROUTER_API_KEY` to Replit Secrets — that alone will make the entire agentic system functional.*
