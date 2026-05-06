# NURA X — Replit-clone AI IDE

## Run & Operate

To start the development server:
```bash
cd Backend-Agent && node_modules/.bin/tsx main.ts
# Server starts on port 5000
```

Required Environment Variables:
- `OPENROUTER_API_KEY`
- `LLM_BASE_URL` (defaults to OpenRouter if not set)
- `LLM_MODEL` (default `openai/gpt-oss-120b:free`, override with `anthropic/claude-3.5-sonnet` for better performance)
- `CLOUDFLARE_API_TOKEN` (optional, for SSL)

Key Commands:
- Build: `npm run build` (handled by `package_manager.service.ts` and `project_runner.service.ts`)
- Typecheck: _Populate as you build_
- Codegen: Handled by `backend-code-generator/` (48 framework templates)
- DB Push: Drizzle migrations handle schema updates (see `shared/schema.ts`)

## Stack

- **Runtime**: Node.js 20 + TypeScript (ts-node ESM)
- **Framework**: Express 4, React + Vite
- **Database**: Drizzle ORM over PostgreSQL (production), `better-sqlite3` (embedded SQLite for deployer)
- **Validation**: _Populate as you build_
- **Build Tool**: Vite (frontend), Docker (backend containerization), native `npm`/`pip`/`git` commands

## Where things live

- `client/`: Frontend (React + Vite)
- `server/`: Backend (Express, main logic)
  - `server/api/`: All HTTP route factories
  - `server/infrastructure/db/`: Drizzle client and DB orchestrator
  - `server/orchestration/`: Agent orchestrator, pipeline runner
  - `server/services/`: Core services (project runner, package manager, git)
  - `server/llm/`: LLM client integration
  - `server/agents/`: AI agents and their domains (complex logic, HVP compliant)
  - `server/deployer/`: Legacy deployment pipeline
  - `server/core/config/index.ts`: Central environment/config loader
- `shared/schema.ts`: Database schema definition (Drizzle)

## Architecture decisions

- **Category-Based Backend Architecture**: Backend reorganized into `core/`, `infrastructure/`, `api/`, `orchestration/`, `services/`, `tools/`, `streams/`, `llm/`, `agents/` for high cohesion and low coupling.
- **Sandboxed Execution**: All FS operations and child process executions are strictly scoped to `.sandbox/<projectId>/` via `server/infrastructure/sandbox/sandbox.util.ts`.
- **Event-Driven Orchestration**: A central Event Bus (`server/infrastructure/events/bus.ts`) acts as the single fan-out point for all system events, enabling loose coupling between components.
- **ReAct Agent Loop**: The primary AI agent uses a ReAct (Reasoning and Acting) loop with tool/function calling capabilities to interact with the environment and achieve goals.
- **Hierarchical Vertical Partitioning (HVP)**: `server/agents/` modules strictly follow HVP for agent isolation, ensuring no direct agent-to-agent imports and clear separation of concerns.

## Product

NURA X is an AI-powered IDE that functions like a Replit clone. It allows users to:
- Create and manage coding projects.
- Run and debug code in sandboxed environments.
- Deploy applications directly from their repositories.
- Interact with an AI agent that can understand intent, write code, fix bugs, and manage packages.
- Get real-time feedback and logs from running processes.
- Benefit from intelligent code generation, architecture analysis, and security scanning.

## User preferences

_Populate as you build_

## Gotchas

- **Sandbox Scope**: All file system and process operations are restricted to the project's sandbox directory. Do not attempt to access files outside this scope.
- **LLM Tool Context Limits**: Tool results passed back to the LLM are trimmed to 10KB. Ensure tools provide concise outputs.
- **Deployer Storage**: `server/deployer/storage/` is for persistent data (SQLite DB, artifacts), not code. Do not modify or add code there.
- **Agent Isolation**: Agents in `server/agents/` are designed for strict isolation; avoid direct imports between agents.
- **Project Creation**: Projects are lazy-created upon `resolveProjectId` being called, which honors the `x-project-id` header.

## Pointers

- **Replit Documentation**: For understanding the core functionality of a cloud IDE.
- **Drizzle ORM Docs**: For database schema and query building.
- **Express.js Docs**: For backend API development.
- **React Docs / Vite Docs**: For frontend development.
- **OpenRouter API Docs**: For details on LLM integration and available models.
- **HVP (Hierarchical Vertical Partitioning) Principles**: For understanding the agent architecture.