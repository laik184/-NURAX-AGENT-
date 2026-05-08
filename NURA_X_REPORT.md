# NURA X — Architecture Audit & server/chat/ Module Report

---

## SECTION 1 — KYA FIX KIYA GAYA (Architecture Audit)

Architecture audit mein 6 root causes milein jo pipeline recursion aur layer violations cause karte the.
Neeche har fix ka detail diya gaya hai.

---

### FIX 1 — corePipeline Phase Orchestrators Dispatch Registry Se Hataaye Gaye

**File:** `server/agents/core/pipeline/registry/orchestrator.registry.ts`

**Problem:**
Ye 7 phase orchestrators galti se `ORCHESTRATOR_REGISTRY` mein registered the — yaane dispatch system unhe mid-pipeline re-invoke kar sakta tha:

| ID | Kya karta hai |
|----|---------------|
| `core:router` | Request ko sahi phase mein route karta hai |
| `intel:decision-engine` | Plan banata hai |
| `intel:planner-boss` | Tasks allocate karta hai |
| `intel:validation-engine` | Output validate karta hai |
| `core:recovery` | Errors se recover karta hai |
| `intel:feedback-loop` | Quality check karta hai |
| `core:memory` | Context memory manage karta hai |

`executePipeline()` inhe apni 9-phase fixed sequence mein seedha call karta hai. Agar dispatch bhi inhe call kar leta to same singleton `state.ts` corrupt ho jata aur recursive execution chain ban jata.

**Fix:** Inhe `ORCHESTRATOR_REGISTRY` se remove kiya. Ab ye alag `PHASE_ORCHESTRATOR_REGISTRY` mein export hote hain — sirf tooling ke liye, dispatch ke liye kabhi nahi.

---

### FIX 2 — Platform Services (Forbidden Layer) Dispatch Registry Se Hataaye Gaye

**File:** `server/agents/core/pipeline/registry/orchestrator.registry.ts`

**Problem:**
Ye 9 platform-layer components worker dispatch registry mein the — architecture spec ke hisaab se strictly forbidden:

| ID | Kya karta hai |
|----|---------------|
| `platform:http-routes` | Express routers — infrastructure layer hai |
| `platform:streams` | SSE/WebSocket handlers |
| `platform:tools` | LLM tool registry |
| `platform:event-bus` | Event bus singleton |
| `platform:preview-proxy` | Dev preview proxy |
| `platform:persistence` | Database layer |
| `platform:sandbox` | Sandbox filesystem |
| `platform:llm-client` | Raw LLM HTTP client |
| `platform:event-processor` | Event processor |

**Fix:** Inhe `ORCHESTRATOR_REGISTRY` se remove kiya. Ab ye `PLATFORM_SERVICES_REGISTRY` mein hain — sirf diagnostics ke liye. `platform:http-routes` aur `platform:streams` ko fully forbidden mark kiya — agar koi inhe invoke kare to immediately throw karenge.

---

### FIX 3 — 6 Broken Import Paths Fix Kiye Gaye

**File:** `server/agents/core/pipeline/registry/orchestrator.registry.ts`

**Problem:**
Platform service entries mein galat paths the jo exist hi nahi karte:

| Galat Path | Sahi Path |
|------------|-----------|
| `server/db/client` | `server/infrastructure/db/index` |
| `server/events/bus` | `server/infrastructure/events/bus` |
| `server/proxy/preview` | `server/infrastructure/proxy/preview` |
| `server/sandbox/util` | `server/infrastructure/sandbox/sandbox.util` |

Ye silent runtime failures the — koi error nahi deta tha jab tak lazy-load hota.

**Fix:** Sab paths `server/infrastructure/*` ke sahi locations par point kiye.

---

### FIX 4 — `platform:llm-client` Capability Clash Fix Kiya

**Problem:**
`platform:llm-client` aur `realtime:chat` dono ke paas `'chat'` capability thi. Koi bhi `'chat'` dispatch raw LLM HTTP client ko bhi hit karta tha.

**Fix:** `platform:llm-client` se `'chat'` capability remove ki. Ab uske paas: `'llm'`, `'openrouter'`, `'completion'`, `'tool-calling'` hain. Moot point bhi hai kyunki ab ye dispatch se bahar hai.

---

### FIX 5 — Recursion Guard `executePipeline()` Mein Add Kiya

**File:** `server/agents/core/pipeline/orchestrator.ts`

**Problem:**
Agar koi dispatch path loop karke wapas `executePipeline()` mein aata, koi protection nahi thi — stack overflow ho jata.

**Fix:** Module-level `_activePipelines` Map add kiya:

```
enterPipeline(requestId) — function start par call hota hai
exitPipeline(requestId)  — success aur catch dono mein call hota hai
```

Agar same `requestId` dobara aaye to immediately clear error throw karta hai stack overflow se pehle.

---

### FIX 6 — Phase 6 Dispatch Par Domain Filter Lagaya Gaya

**File:** `server/agents/core/pipeline/orchestrator.ts`

**Problem:**
Phase 6 `dispatch()` call mein koi `domainFilter` nahi tha — koi bhi domain, including `'core-support'` aur `'platform-services'`, target ho sakti thi.

**Fix:** `PHASE6_DOMAIN_FILTER` constant add kiya:

```
Allowed domains: generation, intelligence, security,
                 observability, devops, infrastructure,
                 data, realtime
```

Phase 6 dispatch ab sirf in 8 worker domains ko target kar sakta hai.

---

### FIX 7 — `index.ts` Exports Update Kiye

**File:** `server/agents/core/pipeline/index.ts`

Nayi exports add ki gayi external tooling ke liye:
- `PHASE_ORCHESTRATOR_REGISTRY`
- `PLATFORM_SERVICES_REGISTRY`
- `WORKER_DISPATCH_DOMAINS`
- `FORBIDDEN_DISPATCH_IDS`
- `FORBIDDEN_DISPATCH_DOMAINS`
- `assertRegistryIntegrity`

---

### Saari Defensive Protections Ka Summary

| Protection | File |
|------------|------|
| `assertRegistryIntegrity()` — server start par run hota hai | `orchestrator.registry.ts` |
| `FORBIDDEN_DISPATCH_IDS` + `FORBIDDEN_DISPATCH_DOMAINS` constants | `orchestrator.registry.ts` |
| `WORKER_DISPATCH_DOMAINS` allowlist — har dispatch mein | `dispatcher.ts` |
| Cycle detection — `_activeDispatch` Set per dispatch round | `dispatcher.ts` |
| `assertNotForbiddenEntry()` — har entry ke liye defence check | `dispatcher.ts` |
| Recursion depth guard — `_activePipelines` Map | `orchestrator.ts` |
| Phase 6 `domainFilter` — worker-only domains | `orchestrator.ts` |
| Duplicate ID detection — integrity check mein | `orchestrator.registry.ts` |

---

---

## SECTION 2 — server/chat/ MODULE — COMPLETE FILE-BY-FILE EXPLANATION

`server/chat/` NURA X ka **chat aur agent execution layer** hai.
Ye wo module hai jo user ke goal ko leke AI agent ko chalata hai aur real-time results wapas bhejta hai.

---

### DIRECTORY STRUCTURE

```
server/chat/
│
├── index.ts                          ← Module ka entry point
├── orchestrator.ts                   ← Central controller (ChatOrchestrator class)
│
├── events/
│   ├── bus.ts                        ← Event bus re-export
│   └── console-log-persister.ts      ← Console logs ko DB mein save karta hai
│
├── pipeline/
│   ├── types.ts                      ← Shared TypeScript types
│   ├── controller.ts                 ← PipelineController — main entry point
│   ├── runs.ts                       ← Active run tracking + cancellation
│   ├── runner.ts                     ← Pipeline mode agent executor
│   ├── tool-loop-runner.ts           ← Tool-loop mode agent executor
│   ├── agent-loop.ts                 ← @deprecated backward-compat re-export
│   ├── agent-loop-runner.ts          ← @deprecated backward-compat re-export
│   ├── active-project.ts             ← Project ID resolve karta hai
│   ├── code-files.ts                 ← Code files extract + sandbox mein write
│   ├── event-persist.ts              ← Agent events DB mein persist karta hai
│   ├── question-bus.ts               ← Agent questions user tak pahunchata hai
│   └── tool-reference.ts             ← @deprecated backward-compat re-export
│
├── routes/
│   ├── history.routes.ts             ← GET /history, GET /session/:runId
│   ├── messages.routes.ts            ← CRUD for chat messages
│   ├── feedback.routes.ts            ← Thumbs up/down feedback
│   ├── prompts.routes.ts             ← Suggested prompts (framework-aware)
│   ├── stream.routes.ts              ← SSE token + lifecycle streams
│   └── upload.routes.ts              ← File uploads (image, PDF, code)
│
└── streams/
    ├── sse.ts                        ← Server-Sent Events — 10 SSE endpoints
    └── ws-server.ts                  ← WebSocket server — 4 WS channels
```

---

### SECTION 2A — events/ Folder

#### `events/bus.ts`
```
Kya karta hai:
  server/infrastructure/events/bus.ts ka re-export hai.
  Iska purpose: server/chat/ ke saare files is local path se import karein
  lekin singleton instance ek hi rahe.

Important: Ye ek thin wrapper hai, koi logic nahi.
```

#### `events/console-log-persister.ts`
```
Kya karta hai:
  Bus par "console.log" events sun ta hai aur inhe
  consoleLogs DB table mein batch-insert karta hai.

  Server startup par ChatOrchestrator.startPersistence() se ek baar start hota hai.

Kaise kaam karta hai:
  1. bus.on("console.log") — har console output capture karta hai
  2. Buffer mein daalta hai (100 lines tak)
  3. Har 500ms mein DB mein flush karta hai
  4. SIGTERM/SIGINT par bhi flush karta hai taaki koi log na chute

DB Table: consoleLogs
```

---

### SECTION 2B — pipeline/ Folder

#### `pipeline/types.ts`
```
Kya karta hai:
  Saare shared TypeScript interfaces define karta hai jo poore
  pipeline mein use hote hain.

Interfaces:
  RunInput  — user se aane wala goal, mode, context
  RunHandle — ek active run ka reference (runId, projectId, status)
  CodeFile  — ek generated file (path + content)
```

#### `pipeline/controller.ts` — CENTRAL ENTRY POINT
```
Kya karta hai:
  PipelineController class — yahi wo jagah hai jahan naya agent run shuru hota hai.

Methods:
  runGoal(input)    — naya run create karta hai:
                      1. Unique runId generate karta hai
                      2. agentRuns DB table mein insert karta hai
                      3. bus par "run.lifecycle: started" emit karta hai
                      4. Background mein executeAsync() chalata hai
                      5. RunHandle turant return karta hai (non-blocking)

  cancel(runId)     — run ko cancel mark karta hai
  get(runId)        — run ka current handle wapas deta hai

Mode Selection:
  mode !== "pipeline"  →  Tool-Loop Runner use karta hai  (default, smart agent)
  mode === "pipeline"  →  Pipeline Runner use karta hai   (9-phase structured)
```

#### `pipeline/runs.ts`
```
Kya karta hai:
  In-memory run registry aur cancellation tracker.

  runs Map       — runId → RunHandle (saare active runs)
  cancellations  — runId Set (cancel request hue runs)

Functions:
  newRunId()        — unique run ID generate karta hai
  registerRun()     — naya run track mein add karta hai
  requestCancel()   — run ko cancel mark karta hai
  isCancelled()     — check karta hai run cancel hua ya nahi
  clearCancel()     — run khatam hone par cleanup karta hai
```

#### `pipeline/tool-loop-runner.ts` — DEFAULT EXECUTION PATH
```
Kya karta hai:
  Tool-loop agent ka lifecycle manage karta hai.
  Ye ek runner hai, khud agent nahi — actual agent server/agents/core/tool-loop/ mein hai.

Steps:
  1. "phase.started" event emit karta hai
  2. Sandbox directory ensure karta hai
  3. runAgentLoop() call karta hai (asli AI agent)
  4. Result ke hisaab se agentRuns DB update karta hai
  5. "run.lifecycle" event emit karta hai
  6. Cancel check karta hai
  7. Error case mein bhi DB update aur event emit karta hai

Agent Loop: server/agents/core/tool-loop/
Max Steps: 25 (configurable via context.maxSteps)
```

#### `pipeline/runner.ts` — PIPELINE MODE EXECUTION
```
Kya karta hai:
  9-phase pipeline mode ka lifecycle manage karta hai.
  executePipeline() (server/agents/core/pipeline/) ko wrap karta hai.

Steps:
  1. "phase.started" event emit karta hai
  2. executePipeline() call karta hai (poori 9-phase pipeline)
  3. Har phase ke result ke liye events emit karta hai
  4. Har phase mein code files dhundta aur sandbox mein likhta hai
  5. Final status DB mein save karta hai
  6. Cancel check karta hai
```

#### `pipeline/agent-loop.ts` (Deprecated)
```
Kya karta hai:
  Sirf backward compatibility ke liye.
  server/agents/core/tool-loop/ se re-export karta hai.
  Naya code yahan import nahi kare.
```

#### `pipeline/agent-loop-runner.ts` (Deprecated)
```
Kya karta hai:
  Sirf backward compatibility ke liye.
  tool-loop-runner.ts se re-export karta hai.
```

#### `pipeline/active-project.ts`
```
Kya karta hai:
  Request mein se projectId nikalta hai.
  Sources: request body → query param → x-project-id header → latest project DB se

Functions:
  resolveProjectId()          — request se project ID dhundta hai, auto-create NAHI karta
  getOrCreateActiveProject()  — latest used project ID deta hai
```

#### `pipeline/code-files.ts`
```
Kya karta hai:
  Agent ke output mein se generated code files dhundta aur sandbox mein likhta hai.

Functions:
  extractCodeFiles(data)  — kisi bhi nested data structure mein
                            { path, content } wale objects dhundta hai

  writeFiles(projectId, files, runId)  — har file ke liye:
    1. Sandbox mein safe path resolve karta hai
    2. File likhta hai disk par
    3. diffQueue DB table mein change record karta hai
    4. artifacts DB table mein artifact record karta hai
    5. "file.written" event bus par emit karta hai
```

#### `pipeline/event-persist.ts`
```
Kya karta hai:
  Har "agent.event" bus event ko agentEvents DB table mein save karta hai.
  Ek baar attach hota hai (idempotent).

DB Table: agentEvents
Fields:   runId, phase, agentName, eventType, payload
```

#### `pipeline/question-bus.ts`
```
Kya karta hai:
  Agent jo questions poochta hai unhe user tak pahunchata hai aur
  user ka jawab agent ko wapas deta hai.

Kaise kaam karta hai:
  1. Agent waitForAnswer() call karta hai — Promise hang hoti hai
  2. Frontend user ko question dikhata hai
  3. User jawab deta hai — POST /api/chat/answer
  4. resolveQuestion() call hota hai — Promise resolve hoti hai
  5. Agent continue hota hai

Timeout: 5 minutes — baad mein defaultAnswer use hota hai
```

#### `pipeline/tool-reference.ts` (Deprecated)
```
Kya karta hai:
  server/agents/core/tool-loop/tool-reference.ts se TOOL_REFERENCE re-export karta hai.
  Naya code seedha agent se import kare.
```

---

### SECTION 2C — routes/ Folder

#### `routes/history.routes.ts`
```
Endpoints:
  GET /api/chat/history?projectId=X
    → Ek project ke last 30 agent runs return karta hai
    → Har run ka title (80 char), relative time, status return hota hai

  GET /api/chat/session/:runId
    → Ek run ke saare chat messages return karta hai (max 500)

DB Tables: agentRuns, chatMessages
```

#### `routes/messages.routes.ts`
```
Endpoints:
  POST /api/chat/messages
    → Naya chat message create karta hai
    → Required: projectId, role (user/agent/system/tool), content

  GET /api/chat/messages?projectId=X&runId=Y
    → Messages fetch karta hai (filter by project + optional runId)
    → Max 500 messages

  DELETE /api/chat/messages/:id
    → Specific message delete karta hai

DB Table: chatMessages
```

#### `routes/feedback.routes.ts`
```
Endpoints:
  POST   /api/chat/messages/:id/feedback   → thumbs_up ya thumbs_down set karta hai
  DELETE /api/chat/messages/:id/feedback   → feedback clear karta hai
  GET    /api/chat/messages/:id/feedback   → current feedback deta hai

DB Table: chatMessages (feedback column)
```

#### `routes/prompts.routes.ts`
```
Kya karta hai:
  Suggested prompts deta hai jo user dekh sakta hai "Try an example" section mein.
  Project ke framework ke hisaab se prompts customize hote hain.

Endpoint:
  GET /api/chat/prompts?projectId=X
    → Framework-specific prompts pehle, phir base prompts
    → Max 8 prompts return karta hai

Supported Frameworks: react, nextjs, express, vite, postgres, vue, svelte
```

#### `routes/stream.routes.ts`
```
Endpoints:
  GET /api/chat/stream/tokens?runId=X
    → Agent ke messages ko word-by-word SSE stream karta hai
    → 16ms delay per word (typing effect)
    → "stream_end" event run khatam hone par

  GET /api/chat/stream/lifecycle?runId=X
    → Run lifecycle events stream karta hai (started/completed/failed/cancelled)
```

#### `routes/upload.routes.ts`
```
Kya karta hai:
  User se files upload karta hai aur project context mein attach karta hai.

Endpoint:
  POST /api/chat/upload
    → Max 5 files, max 10MB per file
    → Allowed: images (PNG/JPEG/GIF/WebP/SVG), PDF, text, CSV, JSON, ZIP, Markdown
    → files ./uploads/chat/ mein store hoti hain
    → DB mein chatUploads table mein record hota hai

  GET /api/chat/uploads?projectId=X&runId=Y
    → Project/run ke uploads list karta hai

DB Table: chatUploads
```

---

### SECTION 2D — streams/ Folder

#### `streams/sse.ts` — Server-Sent Events (10 Endpoints)
```
Kya karta hai:
  Browser ko real-time updates bhejta hai (one-way, HTTP connection open rehti hai).

SSE Endpoints:
  /api/agent/stream          → Agent events + run lifecycle (runId filter supported)
  /sse/console               → Console output stream (projectId filter)
  /api/solopilot/stream      → SoloPilot console stream
  /sse/files                 → File change notifications (projectId filter)
  /api/stream                → Sab kuch ek saath (agent + lifecycle + console)
  /sse/agent                 → Agent events (runId filter)
  /sse/preview               → Preview pane ke liye (console + lifecycle)
  /sse/file                  → File changes
  /events                    → All events combined
  /api/solopilot/dashboard/  → Dashboard events
  /api/builds/:buildId/logs  → Build-specific logs

Common Features:
  - Har connection par 15s heartbeat (ping) bhejta hai
  - Connection close hone par cleanup hota hai
  - X-Accel-Buffering: no (Nginx buffering disable)
```

#### `streams/ws-server.ts` — WebSocket Server (4 Channels)
```
Kya karta hai:
  Bidirectional real-time communication — terminal, execute, agent, files.

WS Channels:
  /ws/terminal?projectId=X
    → Sandboxed bash terminal (projectId required, scope enforce hota hai)
    → stdin/stdout/stderr bidirectional
    → Shell process kill hota hai connection close hone par

  /ws/execute/:sessionId
    → Existing execution session se connect karta hai
    → Previous output replay karta hai, phir live stream karta hai

  /ws/agent/:runId
    → Agent events aur lifecycle events receive karta hai
    → Specific run ko track karne ke liye

  /ws/files/:projectId
    → File system watcher (chokidar)
    → add/change/unlink events real-time mein bhejta hai

Security:
  - Vite HMR aur Replit internal paths (/ws/vite, /__replco) bypass hote hain
  - Unknown paths destroy ho jate hain
  - Terminal strictly sandbox-scoped hai (projectId mandatory)
```

---

### SECTION 2E — `orchestrator.ts` — ChatOrchestrator Class
```
Kya karta hai:
  Poore chat module ka central wiring point.
  main.ts sirf is ek class se baat karta hai.

Methods:
  get pipeline()        → PipelineController expose karta hai (agent runs shuru karne ke liye)
  buildChatRouter()     → Sab HTTP routes ek Express Router mein mount karta hai
  buildSseRouter()      → SSE endpoints ka Router deta hai
  attachWebSocket(srv)  → WebSocket server HTTP server se attach karta hai
  startPersistence()    → Console log persister start karta hai

Extra Route:
  POST /api/chat/answer → Agent questions ka jawab deta hai (question-bus use karta hai)
```

### `index.ts`
```
Kya karta hai:
  Sirf ek line: chatOrchestrator export karta hai.
  Module ka clean public API hai.
```

---

---

## SECTION 3 — COMPLETE WORKING FLOW (Request Se Response Tak)

```
══════════════════════════════════════════════════════════════════════════
                         NURA X — COMPLETE WORKING FLOW
══════════════════════════════════════════════════════════════════════════

USER (Browser)
     │
     │  1. POST /api/chat/run  { goal: "Build me a todo app", projectId: 1 }
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        main.ts (Express Server :3001)                   │
│  chatOrchestrator.buildChatRouter() se mount kiya gaya                  │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               server/chat/pipeline/controller.ts                        │
│               PipelineController.runGoal()                              │
│                                                                         │
│  ① newRunId() generate karta hai  →  "run-1746706643-abc123"           │
│  ② agentRuns DB insert (status: "running")                             │
│  ③ bus.emit("run.lifecycle", { status: "started" })                    │
│  ④ executeAsync() background mein shuru karta hai  (non-blocking)      │
│  ⑤ RunHandle TURANT return karta hai                                   │
└──────────┬──────────────────────────────────────────────────────────────┘
           │
           │  (User ko runId milta hai — woh SSE/WS se connect kar leta hai)
           │
           ├──── mode !== "pipeline" (DEFAULT)  ─────────────────────────┐
           │                                                               │
           ▼                                                               ▼
┌──────────────────────────┐                              ┌───────────────────────────┐
│  tool-loop-runner.ts     │                              │  runner.ts                │
│  (TOOL LOOP MODE)        │                              │  (PIPELINE MODE)          │
│                          │                              │                           │
│  runAgentLoop() call →   │                              │  executePipeline() call → │
│  server/agents/core/     │                              │  server/agents/core/      │
│  tool-loop/              │                              │  pipeline/                │
└──────────┬───────────────┘                              └────────────┬──────────────┘
           │                                                            │
           ▼                                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                     AGENT EXECUTION (Background Thread)                              │
│                                                                                      │
│  TOOL LOOP MODE:                        PIPELINE MODE:                               │
│  ┌─────────────────────┐                ┌──────────────────────────────────┐         │
│  │  ReAct Loop (25 max)│                │  9-Phase Fixed Sequence:         │         │
│  │  ① LLM call        │                │  Phase 1: Routing                │         │
│  │  ② Tool select     │                │  Phase 2: Decision Making        │         │
│  │  ③ Tool execute    │                │  Phase 3: Planning               │         │
│  │  ④ Result to LLM   │                │  Phase 4: Generation (Code Write)│         │
│  │  ⑤ Repeat until   │                │  Phase 5: Validation             │         │
│  │    done/max steps  │                │  Phase 6: Worker Dispatch        │         │
│  └─────────────────────┘                │  Phase 7: Recovery (if needed)  │         │
│                                         │  Phase 8: Feedback Loop         │         │
│                                         │  Phase 9: Memory Save           │         │
│                                         └──────────────────────────────────┘         │
└──────────┬───────────────────────────────────────────┬───────────────────────────────┘
           │                                           │
           ▼                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                          Event Bus (Infrastructure Layer)                            │
│                    server/infrastructure/events/bus.ts                               │
│                                                                                      │
│  Events Emitted:                                                                     │
│  • agent.event   { phase, eventType, payload, runId, projectId }                    │
│  • run.lifecycle { status: started/completed/failed/cancelled, runId }              │
│  • console.log   { line, stream, projectId }                                         │
│  • file.change   { path, projectId }                                                 │
│  • file.written  { path, bytes, projectId }                                          │
└───┬──────────────┬────────────────┬───────────────────┬────────────────────────────┘
    │              │                │                   │
    ▼              ▼                ▼                   ▼
┌────────┐   ┌─────────┐   ┌────────────────┐   ┌────────────────────┐
│SSE     │   │WebSocket│   │event-persist   │   │console-log-        │
│streams │   │channels │   │.ts             │   │persister.ts        │
│(sse.ts)│   │(ws-     │   │                │   │                    │
│        │   │server   │   │agentEvents DB  │   │consoleLogs DB      │
│10      │   │.ts)     │   │mein save karta │   │mein batch save     │
│SSE     │   │         │   │hai             │   │karta hai           │
│endpts  │   │4 WS     │   │                │   │(500ms batch)       │
│        │   │channels │   │                │   │                    │
└────┬───┘   └────┬────┘   └────────────────┘   └────────────────────┘
     │             │
     └──────┬──────┘
            │
            ▼ (Real-time browser ko update)
┌──────────────────────────────────────────────────────────────────┐
│                      USER (Browser)                              │
│                                                                  │
│  SSE: /api/agent/stream    → Phase events dikhata hai            │
│  SSE: /api/chat/stream/    → Token-by-token typing effect        │
│       tokens                                                     │
│  WS:  /ws/agent/:runId     → Phase events (alternative)         │
│  WS:  /ws/terminal         → Live terminal access                │
│  WS:  /ws/files/:projectId → File tree real-time update          │
└──────────────────────────────────────────────────────────────────┘
            │
            │  (Agent ne files generate kiye)
            ▼
┌──────────────────────────────────────────────────────────────────┐
│                   code-files.ts                                  │
│                                                                  │
│  Agent output mein { path, content } dhundta hai                 │
│  ↓                                                               │
│  .sandbox/{projectId}/... mein file likhta hai                   │
│  ↓                                                               │
│  diffQueue DB: purana aur naya content record karta hai          │
│  artifacts DB: artifact record banata hai                        │
│  bus.emit("file.written") → WS /ws/files/ ko notify karta hai   │
└──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────┐
│              Run Complete                                        │
│                                                                  │
│  agentRuns DB update: status = success/failed/cancelled          │
│  bus.emit("run.lifecycle", { status: "completed" })             │
│  → SSE "stream_end" event browser ko                            │
│  → WS "lifecycle: completed" event browser ko                   │
└──────────────────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════
                    AGENT QUESTION FLOW (Interactive)
══════════════════════════════════════════════════════════════════════════

Agent (mid-execution)
     │
     │  waitForAnswer(runId, questionId, defaultAnswer)
     │  → Promise hang hoti hai
     ▼
bus.emit("agent.question", { questionId, options })
     │
     ▼
SSE/WS se browser ko event milta hai
     │
     ▼
User option choose karta hai → POST /api/chat/answer
     │
     ▼
resolveQuestion() → Promise resolve hoti hai
     │
     ▼
Agent continue hota hai apne kaam se


══════════════════════════════════════════════════════════════════════════
                    DATABASE TABLES USED (server/chat/)
══════════════════════════════════════════════════════════════════════════

  agentRuns      — Har run ka record (goal, status, startedAt, endedAt, result)
  agentEvents    — Har phase event ka record (runId, phase, eventType, payload)
  chatMessages   — Chat messages (role, content, feedback, tokensUsed)
  chatUploads    — Uploaded files metadata
  consoleLogs    — Terminal/process console output
  diffQueue      — File changes queue (oldContent, newContent, status)
  artifacts      — Generated code artifacts


══════════════════════════════════════════════════════════════════════════
                    API ENDPOINTS SUMMARY (server/chat/)
══════════════════════════════════════════════════════════════════════════

  HTTP Routes (all under /api/chat/):
  ┌──────────────────────────────────────────────────────────┐
  │ GET    /history          → Past runs list               │
  │ GET    /session/:runId   → Run ke messages              │
  │ POST   /messages         → Naya message create          │
  │ GET    /messages         → Messages fetch               │
  │ DELETE /messages/:id     → Message delete               │
  │ POST   /messages/:id/feedback  → Feedback set           │
  │ DELETE /messages/:id/feedback  → Feedback clear         │
  │ GET    /messages/:id/feedback  → Feedback get           │
  │ GET    /prompts          → Suggested prompts            │
  │ POST   /upload           → File upload                  │
  │ GET    /uploads          → Uploads list                 │
  │ GET    /stream/tokens    → Token stream (SSE)           │
  │ GET    /stream/lifecycle → Lifecycle stream (SSE)       │
  │ POST   /answer           → Agent question ka jawab      │
  └──────────────────────────────────────────────────────────┘

  SSE Endpoints:
  ┌──────────────────────────────────────────────────────────┐
  │ /api/agent/stream        → Agent + lifecycle events     │
  │ /sse/console             → Console output               │
  │ /sse/files               → File changes                 │
  │ /api/stream              → All events combined          │
  │ /sse/agent               → Agent events only            │
  │ /sse/preview             → Preview pane updates         │
  │ /events                  → Universal event stream       │
  └──────────────────────────────────────────────────────────┘

  WebSocket Channels:
  ┌──────────────────────────────────────────────────────────┐
  │ /ws/terminal             → Live bash terminal           │
  │ /ws/execute/:sessionId   → Execution session            │
  │ /ws/agent/:runId         → Run-specific agent events   │
  │ /ws/files/:projectId     → File system watcher         │
  └──────────────────────────────────────────────────────────┘
```

---

## SECTION 4 — FILES MODIFIED/CREATED (Complete List)

### Architecture Fixes (Modified)
| File | Kya badla |
|------|-----------|
| `server/agents/core/pipeline/registry/orchestrator.registry.ts` | Forbidden entries hataaye, integrity checks add kiye |
| `server/agents/core/pipeline/registry/dispatcher.ts` | Domain allowlist, cycle detection, forbidden guards |
| `server/agents/core/pipeline/orchestrator.ts` | Recursion guard, Phase 6 domain filter |
| `server/agents/core/pipeline/index.ts` | New registries export kiye |

### Replit Migration (Created/Modified)
| File | Kya kiya |
|------|----------|
| `shared/schema.ts` | 8 DB tables define kiye (Drizzle ORM) |
| `server/infrastructure/db/index.ts` | PostgreSQL connection setup |
| `main.ts` | Server entry point |
| `vite.config.ts` | Vite dev server config (port 5000, proxy /api → 3001) |
| `NURA_X_REPORT.md` | Ye report file |

---

*Report generated: May 2026*
*Server Status: Running on port 3001 (API) + 5000 (Vite)*
*DB Status: PostgreSQL connected, 8 tables active*
*OPENROUTER_API_KEY: Pending — AI agent features require this secret*
