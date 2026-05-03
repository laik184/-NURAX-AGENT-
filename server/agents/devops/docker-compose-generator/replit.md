# Docker Compose Generator

HVP-compliant system that generates production-ready `docker-compose.yml` files for multi-service applications.

---

## Architecture Layers

```
L0  →  types.ts, state.ts          (contracts — no upward imports)
L1  →  orchestrator.ts             (pipeline sequencing — no logic)
L2  →  agents/                     (one job each — import L0 + L3 only)
L3  →  utils/                      (pure helpers — no agent imports)
```

**Import direction:** L1 → L2 → L3 → L0. No agent-to-agent imports. Pure generation — no execution, no infra side effects.

---

## Pipeline Flow

```
caller
  └─ orchestrator.generateCompose({ projectName, services, globalEnv })
       │
       ├─ 1. service-builder       → normalize names, assign default ports, build context, restart policy
       │       name-normalizer.util → port-mapper.util → path-resolver.util
       │
       ├─ 2. network-builder       → create default bridge network + any service-declared networks
       │       name-normalizer.util
       │
       ├─ 3. volume-builder        → create named volumes for stateful roles (db, cache)
       │       name-normalizer.util → path-resolver.util
       │
       ├─ 4. env-builder           → inject default + role-specific + global env vars per service
       │       name-normalizer.util
       │
       ├─ 5. dependency-mapper     → resolve implicit depends_on by role, detect circular deps
       │
       ├─ 6. compose-validator     → validate required fields, port conflicts, missing deps/networks
       │       port-mapper.util
       │
       └─ 7. yaml-builder.util     → serialize ComposeFile → YAML string
```

---

## File Responsibilities

| File | Layer | Responsibility |
|---|---|---|
| `types.ts` | L0 | `ServiceConfig`, `NetworkConfig`, `VolumeConfig`, `ComposeFile`, `ComposeResult`, `PortMapping`, `HealthCheck`, state types |
| `state.ts` | L0 | Frozen `INITIAL_STATE` + pure `transitionState` |
| `orchestrator.ts` | L1 | Input validation, pipeline sequencing, YAML assembly, report merging |
| `agents/service-builder.agent.ts` | L2 | Normalize service names, assign default ports and build paths, set restart policy |
| `agents/network-builder.agent.ts` | L2 | Create default bridge network + collect all service-declared networks |
| `agents/volume-builder.agent.ts` | L2 | Create named volumes for stateful roles, compute mount paths |
| `agents/env-builder.agent.ts` | L2 | Inject default + role-specific + global environment variables per service |
| `agents/dependency-mapper.agent.ts` | L2 | Resolve implicit `depends_on` by role, run DFS cycle detection |
| `agents/compose-validator.agent.ts` | L2 | Validate fields, dependency references, network declarations, port conflicts |
| `utils/yaml-builder.util.ts` | L3 | `buildComposeYaml` — serialize services, networks, volumes, healthchecks to YAML |
| `utils/port-mapper.util.ts` | L3 | Default ports per role, port string formatting, port-conflict detection |
| `utils/name-normalizer.util.ts` | L3 | Normalize service/network/volume names, convert to env-var format |
| `utils/path-resolver.util.ts` | L3 | Default build paths and volume mount paths per role |
| `utils/logger.util.ts` | L3 | Timestamped log and error string builders |
| `index.ts` | — | Public API: `generateCompose`, `validateCompose`, `getComposeServices` |

---

## Role Defaults

| Role | Default Port | Build Path | Named Volume Mount |
|---|---|---|---|
| `backend` | 3000 | `./backend` | — |
| `frontend` | 80 | `./frontend` | — |
| `database` | 5432 | `./db` | `/var/lib/postgresql/data` |
| `cache` | 6379 | `./cache` | `/data` |
| `proxy` | 80, 443 | `./nginx` | — |
| `worker` | — | `./worker` | — |
| `generic` | — | `.` | — |

## Implicit Dependency Rules

| Service Role | Automatically Depends On |
|---|---|
| `backend` | `database`, `cache` (if present) |
| `frontend` | `backend` (if present) |
| `worker` | `database`, `cache` (if present) |
| `proxy` | `backend`, `frontend` (if present) |

---

## Example Output

**Input:**

```ts
generateCompose({
  projectName: "myapp",
  services: [
    { name: "api",      role: "backend",  build: "./api" },
    { name: "web",      role: "frontend", build: "./web" },
    { name: "postgres", role: "database", image: "postgres:16" },
    { name: "redis",    role: "cache",    image: "redis:7-alpine" },
  ],
  globalEnv: { LOG_LEVEL: "info" },
})
```

**Output `docker-compose.yml` (abbreviated):**

```yaml
version: "3.9"

services:
  api:
    build:
      context: ./api
    ports:
      - "3000:3000"
    networks:
      - myapp-network
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    environment:
      SERVICE_NAME: api
      PROJECT_NAME: myapp
      NODE_ENV: production
      PORT: "3000"
      LOG_LEVEL: info

  web:
    build:
      context: ./web
    ports:
      - "80:80"
    networks:
      - myapp-network
    depends_on:
      - api
    restart: unless-stopped

  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - myapp-network
    restart: unless-stopped
    environment:
      POSTGRES_DB: POSTGRES
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - myapp-network
    restart: unless-stopped

networks:
  myapp-network:
    driver: bridge
    labels:
      com.docker.compose.project: myapp

volumes:
  postgres-data:
  redis-data:
```

---

## HVP Compliance Checklist

- [x] Only downward imports (L1 → L2 → L3 → L0)
- [x] No agent-to-agent imports
- [x] One responsibility per agent
- [x] All outputs `Object.freeze`d
- [x] Pure YAML generation — no execution, no infra side effects
- [x] Orchestrator contains zero business logic
