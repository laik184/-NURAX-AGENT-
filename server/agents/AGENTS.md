# Agents Inventory

> Auto-generated catalog of every agent under `server/agents/`. Each agent owns an `orchestrator.ts` and is invokable through the central pipeline registry.

**Total agents:** 123

## Summary by category

| | Category | Count |
|---|---|---|
| 🧠 | **Core** | 22 |
| 🗄️ | **Data** | 2 |
| 🛠️ | **DevOps** | 3 |
| 🏗️ | **Generation** | 41 |
| 🚀 | **Infrastructure** | 3 |
| 🤔 | **Intelligence** | 40 |
| 📈 | **Observability** | 4 |
| 🔌 | **Realtime** | 2 |
| 🛡️ | **Security** | 6 |

---

## 🧠 Core (22)

_Pipeline plumbing — context, execution, LLM, memory, recovery, routing_

| Icon | Agent | Path | Role |
|---|---|---|---|
| 🗂️ | `codebase‑indexer` | `core/context/indexing/codebase-indexer` | The indexer runs a strict orchestrated pipeline with no business logic inside the orchestrator other than delegation and state transitions: |
| 📚 | `context‑builder` | `core/context/indexing/context-builder` | query → relevance-scorer → context-selector → dependency-expander → context-pruner → ranking-engine |
| 🔍 | `diff‑reviewer` | `core/context/review/diff-reviewer` | The diff-reviewer module provides a pre-apply safety gate for code changes. It parses a proposed diff, classifies change types, evaluates risks, detects potential breaking chang... |
| 🛠️ | `code‑fixer` | `core/execution/code-ops/code-fixer` | code-fixer is a stateless orchestration agent that coordinates automated code fixing in a deterministic closed loop: |
| 🔍 | `diff‑proposer` | `core/execution/code-ops/diff-proposer` | diff-proposer is a stateless, deterministic module that analyzes in-memory source files and structured change intent to produce minimal, safe unified diffs. |
| 📝 | `patch‑engine` | `core/execution/code-ops/patch-engine` | A pure, deterministic code transformation engine that applies targeted patches to |
| 🔀 | `migration‑runner` | `core/execution/db-ops/migration-runner` | This module executes SQL migration files in a strict, ordered, and safe flow. It logs every major execution step, stops immediately on failure, and emits a rollback trigger sign... |
| 🪲 | `debug‑agent` | `core/execution/debug-ops/debug-agent` | 1. orchestrator.ts receives error, logs, stacktrace, and environment context. |
| 🛠️ | `error‑fixer` | `core/execution/debug-ops/error-fixer` | text |
| 💻 | `shell` | `core/execution/shell` | server/agents/execution/shell provides a safe, production-grade shell command execution engine. It validates commands, executes child processes, captures streams, enforces timeo... |
| 📦 | `package‑installer` | `core/execution/shell/package-installer` | package-installer/ provides a stable package installation engine for npm, pnpm, and yarn. It supports installation, updates, and removals with structured outputs, immutable stat... |
| 🧪 | `test‑ops` | `core/execution/test-ops` | The orchestration flow is strictly linear: |
| 📚 | `context` | `core/llm/context` | The engine uses a strict, deterministic pipeline: |
| 🧬 | `embeddings` | `core/llm/embeddings` | The orchestrator is the only Level-1 coordinator and follows this path: |
| 📜 | `llm‑response‑parser` | `core/llm/parser/llm-response-parser` | The parser follows a strict orchestration pipeline: |
| ✏️ | `prompt‑builder` | `core/llm/prompt-builder` | The orchestrator executes a strict, single-pass pipeline: |
| 🚦 | `router` | `core/llm/router` | orchestrator -> capability-matcher -> cost-optimizer -> latency-evaluator -> llm-provider-router -> provider-selector -> fallback-handler |
| 🧠 | `memory` | `core/memory` | This module is the persistent memory system of the AI platform. It gives the system the ability to store, filter, recall, learn from, and automatically clean its own knowledge o... |
| 🏛️ | `global‑governor` | `core/orchestration/global-governor` | When multiple system modules (recovery, planning, decision-engine, self-improvement, router, etc.) produce competing decisions simultaneously, the Global Governor is the single ... |
| 🔗 | `pipeline` | `core/pipeline` | The main execution pipeline that wires all system modules into a single end-to-end flow. This is the authoritative entry point for processing any user request through the full a... |
| 🚑 | `recovery` | `core/recovery` | This module is the fault-tolerance backbone of the system. Any agent — generation, execution, intelligence — can hand off a failure to this engine and receive a structured recov... |
| 🚦 | `router` | `core/router` | This is the entry point of the entire agent system. Every incoming task passes through this router, which determines with high speed and confidence which domain, module, and age... |

## 🗄️ Data (2)

_Data-layer agents — query optimization, caching_

| Icon | Agent | Path | Role |
|---|---|---|---|
| ⚡ | `query‑optimizer` | `data/query-optimizer` | HVP-compliant database query optimization engine for detecting slow queries, N+1 patterns, missing indexes, and generating actionable recommendations. |
| 🟥 | `redis` | `data/redis` | — |

## 🛠️ DevOps (3)

_Deployment, CI/CD, environment configuration_

| Icon | Agent | Path | Role |
|---|---|---|---|
| 🐳 | `docker‑compose‑generator` | `devops/docker-compose-generator` | | Role | Default Port | Build Path | Named Volume Mount | |
| 🔗 | `env‑pipeline‑validator` | `devops/env-pipeline-validator` | HVP-compliant pre-deployment environment validator. Detects missing variables, format errors, schema violations, exposed secrets, and policy breaches before CI/CD runs. |
| 🐙 | `github‑actions‑generator` | `devops/github-actions-generator` | HVP-compliant CI/CD workflow generator. Produces valid .github/workflows/.yml YAML files for any supported language stack. |

## 🏗️ Generation (41)

_Code generators — backend, frontend, mobile, PWA, GraphQL, DB_

| Icon | Agent | Path | Role |
|---|---|---|---|
| 📖 | `api‑doc‑generator` | `generation/backend-gen/api-doc-generator` | orchestrator.ts runs the full pipeline in strict order: |
| 🔐 | `auth‑generator` | `generation/backend-gen/auth-generator` | 1. authenticate verifies active strategy credentials. |
| 🎛️ | `controller‑generator` | `generation/backend-gen/controller-generator` | generateController(config) in orchestrator.ts executes a strict pipeline: |
| 🌱 | `env‑configurator` | `generation/backend-gen/env-configurator` | The env-configurator module provides a focused environment configuration engine that builds schema definitions, loads environment files, applies defaults, validates values, and ... |
| 🧩 | `middleware‑generator` | `generation/backend-gen/middleware-generator` | This generator supports: |
| 🔀 | `migration‑generator` | `generation/backend-gen/migration-generator` | The orchestrator executes a strict, linear pipeline: |
| 🗃️ | `model‑generator` | `generation/backend-gen/model-generator` | orchestrator -> schema-parser -> relation-mapper -> constraint-builder -> index-builder -> model-builder -> orm-adapter |
| 🛣️ | `route‑generator` | `generation/backend-gen/route-generator` | The route generator creates REST route code from endpoint schemas for two frameworks: Express and NestJS. |
| ⚙️ | `service‑generator` | `generation/backend-gen/service-generator` | This module generates production-ready backend service layer code from a structured ServiceConfig. It enforces clean architecture by isolating orchestration, single-responsibili... |
| 🧪 | `test‑generator` | `generation/backend-gen/test-generator` | 1. orchestrator.ts receives backend modules. |
| 🏗️ | `code‑gen` | `generation/code-gen` | code-gen is a layered code generation agent that turns a user intent into a validated file map. |
| ✒️ | `file‑writer` | `generation/code-gen/file-writer` | This module provides safe, atomic file create, update, and delete operations with backup support and immutable operation state tracking. |
| 🏗️ | `mongoose‑schema‑generator` | `generation/database/mongoose-schema-generator` | — |
| 🏗️ | `prisma‑schema‑generator` | `generation/database/prisma-schema-generator` | — |
| 🛰️ | `api‑client` | `generation/frontend-gen/api-client` | This module generates reusable frontend API service files from API schemas/endpoints. It enforces layered HVP boundaries and returns immutable, standardized generation output. |
| 🏗️ | `component‑generator` | `generation/frontend-gen/component-generator` | component-generator is an HVP-compliant frontend generation module that creates reusable UI component artifacts for React (primary) and Vue (secondary). It coordinates planning,... |
| 🏗️ | `form‑generator` | `generation/frontend-gen/form-generator` | This module generates reusable frontend form component code from a typed schema. It produces: |
| 🏗️ | `page‑generator` | `generation/frontend-gen/page-generator` | orchestrator -> layout-builder -> component-composer -> data-binding -> api-integration -> state-integrator -> routing-integrator -> seo-meta |
| 🏗️ | `state‑management‑generator` | `generation/frontend-gen/state-management-generator` | This module generates frontend state architecture artifacts for React and Next projects, supporting Redux Toolkit, Zustand, and Context API. |
| 🏗️ | `style‑generator` | `generation/frontend-gen/style-generator` | 1. breakpoint-manager |
| 🧪 | `test‑generator` | `generation/frontend-gen/test-generator` | Generate frontend unit/integration tests automatically for React, Next.js, and Vue targets while following strict HVP layering. |
| 🏗️ | `resolver‑generator` | `generation/graphql/resolver-generator` | 1. orchestrator.ts receives ResolverConfig with schema + optional handler/permission/loader maps. |
| 🏗️ | `schema‑generator` | `generation/graphql/schema-generator` | The orchestrator drives the complete flow and does not contain business logic: |
| 🧭 | `navigation` | `generation/mobile/android/navigation` | The orchestrator executes a strict, pure-navigation pipeline: |
| 📡 | `kotlin‑retrofit` | `generation/mobile/android/networking/kotlin-retrofit` | The orchestrator owns the wiring and executes this deterministic flow: |
| 🗃️ | `kotlin‑viewmodel‑generator` | `generation/mobile/android/viewmodel/kotlin-viewmodel-generator` | 1. orchestrator.ts validates incoming config using validation.agent.ts. |
| 📡 | `networking` | `generation/mobile/ios-native/networking` | 1. orchestrator.ts receives API configuration and validates it. |
| 🏗️ | `swiftui‑view‑generator` | `generation/mobile/ios-native/ui/swiftui-view-generator` | 1. orchestrator.ts receives ScreenConfig. |
| 🔐 | `biometric‑auth‑agent` | `generation/mobile/rn-core/biometric-auth-agent` | This module delivers HVP-compliant biometric authentication orchestration for React Native mobile applications with Android/iOS support, PIN fallback, security posture checks, t... |
| 📷 | `camera‑agent` | `generation/mobile/rn-core/camera-agent` | This module provides a deterministic, production-grade camera pipeline for React Native generation targets. It enforces strict HVP layering: |
| 🏗️ | `component‑generator` | `generation/mobile/rn-core/component-generator` | This module deterministically generates React Native UI component JSX strings from a normalized request object. It is organized with strict HVP layering: |
| 📍 | `geolocation‑agent` | `generation/mobile/rn-core/geolocation-agent` | Ye module React Native mobile apps ke liye GPS handling karta hai. Isme permission flow, location setup, current coordinate fetch, watcher tracking, reverse geocoding payload, a... |
| 🏗️ | `navigation‑generator` | `generation/mobile/rn-core/navigation-generator` | This module generates a complete mobile navigation system for React Native applications: |
| 💾 | `storage‑agent` | `generation/mobile/rn-core/storage-agent` | The storage-agent module provides a deterministic, layered local data management system for React Native generation workflows. It coordinates four storage strategies (AsyncStora... |
| 💻 | `app‑shell‑generator` | `generation/pwa-gen/app-shell-generator` | orchestrator |
| ✏️ | `install‑prompt` | `generation/pwa-gen/install-prompt` | This module implements a conversion-focused PWA install prompt pipeline using HVP layering. |
| 🏗️ | `manifest‑generator` | `generation/pwa-gen/manifest-generator` | orchestrator.ts |
| 🌐 | `offline‑strategy` | `generation/pwa-gen/offline-strategy` | Offline strategy engine for PWA performance + resilience. |
| 🔔 | `push‑notification‑web` | `generation/pwa-gen/push-notification-web` | A deterministic, HVP-compliant push notification pipeline for PWA/Web that handles permission, subscription lifecycle, VAPID validation, payload construction, delivery timing, c... |
| ⚙️ | `service‑worker‑generator` | `generation/pwa-gen/service-worker-generator` | - agents → logic |
| 🚦 | `routing‑generator` | `generation/routing-generator` | 1. orchestrator.ts starts generation and transitions immutable state. |

## 🚀 Infrastructure (3)

_Deploy & version-control infrastructure_

| Icon | Agent | Path | Role |
|---|---|---|---|
| 🚀 | `deploy` | `infrastructure/deploy` | orchestrator -> deployment-agent -> build-trigger -> deploy-runner -> verification -> rollback-trigger |
| 🐳 | `docker‑configurator` | `infrastructure/deploy/docker-configurator` | The docker-configurator module generates production-ready Docker configuration files (Dockerfile and docker-compose.yml) without running containers or performing runtime orchest... |
| 🌿 | `git` | `infrastructure/git` | This module provides a production-oriented Git operation layer with strict HVP layering: |

## 🤔 Intelligence (40)

_Decision, planning, analysis, optimization, observation_

| Icon | Agent | Path | Role |
|---|---|---|---|
| 🧠 | `cross‑intelligence` | `intelligence/backend-intelligence/cross-intelligence` | Synthesizes signals from multiple intelligence domains (quality, consistency, context, recommendation) into unified insights and correlation reports. |
| 🧠 | `consistency` | `intelligence/backend-intelligence/intelligence/consistency` | The Consistency Engine is a pure intelligence module that receives structured outputs from multiple backend-intelligence modules and produces a deterministic, unified truth. It ... |
| 📚 | `context` | `intelligence/backend-intelligence/intelligence/context` | Context Engine backend-intelligence stack ka pure intelligence layer hai. Yeh raw backend signals ko deterministic contextual intelligence me convert karta hai, without code gen... |
| 🧠 | `quality` | `intelligence/backend-intelligence/intelligence/quality` | The Quality Engine is a deterministic aggregation module that converts backend intelligence signals into a single immutable quality report. It is intentionally split by responsi... |
| 🧠 | `recommendation` | `intelligence/backend-intelligence/intelligence/recommendation` | The Recommendation Engine converts normalized backend analysis signals into deterministic, production-safe recommendations. It only consumes shared contracts from analysis, prio... |
| 🧠 | `report` | `intelligence/backend-intelligence/intelligence/report` | The Backend Intelligence Report Engine consolidates typed outputs from all backend-intelligence modules into one immutable report. The engine follows an HVP pipeline: orchestrat... |
| 🧠 | `priority` | `intelligence/backend-intelligence/issue-prioritizer/priority` | The priority module is a deterministic backend decision engine that ranks technical issues by combining severity, impact, and urgency into a single final score. The engine is pu... |
| 🧠 | `strategy` | `intelligence/backend-intelligence/issue-prioritizer/strategy` | The Strategy Engine transforms prioritized backend issues into deterministic, dependency-aware execution plans. |
| 🧠 | `agent‑capability` | `intelligence/capability-intelligence/agent-capability` | Build a structured, immutable AgentCapabilityMatrix from a set of registered agent descriptors. |
| 🧠 | `discovery` | `intelligence/capability-intelligence/discovery` | Discover all registered capabilities from a raw source catalog and produce an immutable DiscoverySnapshot. This layer surfaces what is available — it does not evaluate, score, g... |
| 🧠 | `decision‑engine` | `intelligence/decision-engine` | The decision-engine is the reasoning brain of the Nura-X agent system. |
| 🧠 | `experimentation` | `intelligence/experimentation` | The Experimentation module enables the system to test multiple approaches before committing to one. It supports: |
| 🧠 | `feedback‑loop` | `intelligence/feedback-loop` | The feedback-loop module transforms the system from a one-shot executor into a self-improving AI engine. |
| 🧠 | `framework‑optimizer` | `intelligence/framework-optimizer` | framework-optimizer is the performance intelligence layer for framework-aware systems (React, Next.js, Express, NestJS, etc.). |
| 🧠 | `framework‑pattern‑engine` | `intelligence/framework-pattern-engine` | This module enforces architecture correctness. |
| 🧠 | `framework‑runtime‑analyzer` | `intelligence/framework-runtime-analyzer` | Framework Runtime Analyzer is a pure runtime-intelligence module that models framework execution behavior from static runtime descriptors (nodes, edges, entryPoints). It provide... |
| 🧪 | `testing` | `intelligence/frontend-intelligence/testing` | Pure static testing analysis engine for frontend component coverage. |
| 🧠 | `meta‑reasoning` | `intelligence/meta-reasoning` | Meta Reasoning is "thinking about thinking." It answers the question: "Was this the right decision, and if not — what should we have done instead?" |
| 🧠 | `global‑observer` | `intelligence/observation/global-observer` | The Global Observer is the system's eyes and ears. It does not modify behavior — it observes, measures, and reports. Any module (recovery, self-improvement, global-governor) can... |
| 🧠 | `optimization‑intelligence` | `intelligence/optimization-intelligence` | A pure analysis engine that ingests structured runtime metrics and code structure |
| 🧠 | `complexity‑analysis` | `intelligence/planning/architecture/code-quality/complexity-analysis` | Measures cyclomatic and cognitive complexity, function length, nesting depth, and callback hell patterns across source files. |
| 🧠 | `dead‑code‑analysis` | `intelligence/planning/architecture/code-quality/dead-code-analysis` | Identifies unreachable code, unused exports, deprecated patterns, and orphaned modules across the codebase. |
| 🧠 | `observability‑analysis` | `intelligence/planning/architecture/code-quality/observability-analysis` | Evaluates the observability posture of the codebase: logging coverage, error handling completeness, tracing hooks, and metrics instrumentation. |
| 📋 | `performance‑analysis` | `intelligence/planning/architecture/code-quality/performance-analysis` | Identifies synchronous blocking patterns, payload bloat, missing caching opportunities, and inefficient database query patterns. |
| 🧠 | `api‑contract‑analysis` | `intelligence/planning/architecture/data-and-api/api-contract-analysis` | Validates API request/response contracts for schema compliance, versioning consistency, and breaking-change detection. |
| 🗄️ | `database‑schema‑analysis` | `intelligence/planning/architecture/data-and-api/database-schema-analysis` | Analyses database schema definitions for normalization issues, missing indexes, type mismatches, and relation integrity problems. |
| 🧠 | `evolution` | `intelligence/planning/architecture/engine/evolution` | The Architecture Evolution Engine transforms an ArchitectureAnalysisReport into a risk-aware ArchitectureEvolutionPlan. |
| 🧠 | `security‑analysis` | `intelligence/planning/architecture/security/security-analysis` | Performs static security analysis covering injection vulnerabilities, authentication gaps, insecure dependencies, and sensitive data exposure. |
| 🧠 | `boundary‑analysis` | `intelligence/planning/architecture/structural/boundary-analysis` | boundary-analysis is a pure, deterministic architectural boundary validation |
| 🧠 | `dependency‑analysis` | `intelligence/planning/architecture/structural/dependency-analysis` | dependency-analysis is a pure, deterministic static analysis engine that |
| 🧠 | `hvp‑analysis` | `intelligence/planning/architecture/structural/hvp-analysis` | hvp-analysis is a pure, deterministic static-analysis engine that validates |
| 🧠 | `pattern‑detection` | `intelligence/planning/architecture/structural/pattern-detection` | This module performs deterministic static analysis over a file list and optional file-content map to detect the dominant architecture pattern, flag anti-patterns, and compute a ... |
| 🧠 | `responsibility‑analysis` | `intelligence/planning/architecture/structural/responsibility-analysis` | responsibility-analysis is a pure, deterministic static analysis engine that |
| 🧪 | `test‑architecture‑analysis` | `intelligence/planning/architecture/testing/test-architecture-analysis` | Evaluates the overall test architecture: coverage distribution, test isolation, assertion quality, and flakiness risk. |
| 🧠 | `Core‑Planning` | `intelligence/planning/planner/Core-Planning` | Core-Planning accepts a structured GoalInput (already refined by PlannerBoss or equivalent) |
| 🧠 | `Intelligence‑Layer` | `intelligence/planning/planner/Intelligence-Layer` | The Intelligence-Layer transforms raw, unstructured user input into a structured, enriched |
| 🧠 | `PlannerBoss` | `intelligence/planning/planner/PlannerBoss` | PlannerBoss is the top-level planning authority of the system. Its sole responsibility is |
| 🧠 | `priority` | `intelligence/priority` | This engine ranks and assigns priority to any list of tasks, feeding ordered decisions into the master orchestrator and decision engine. It evaluates each task across four dimen... |
| 🧠 | `self‑improvement` | `intelligence/self-improvement` | The self-improvement module is the system's introspective core. It accepts raw operational data (latency, error rates, memory, CPU, validation scores, recovery outcomes) and pro... |
| 🧠 | `validation‑engine` | `intelligence/validation-engine` | This is the system quality gate. Every output from generation, execution, and intelligence agents passes through here before being accepted. It detects syntax errors, contract v... |

## 📈 Observability (4)

_Logging, metrics, tracing, health_

| Icon | Agent | Path | Role |
|---|---|---|---|
| ❤️‍🩹 | `health` | `observability/health` | HVP-compliant production-grade health check system exposing /health, /ready, and /live endpoints. |
| 📝 | `logger‑setup` | `observability/logger-setup` | HVP-compliant structured logging system for backend observability. |
| 📈 | `opentelemetry` | `observability/opentelemetry` | HVP-compliant distributed tracing + metrics observability system. |
| 📈 | `prometheus‑metrics` | `observability/prometheus-metrics` | HVP-compliant Prometheus metrics module for system observability. |

## 🔌 Realtime (2)

_WebSocket & live-chat agents_

| Icon | Agent | Path | Role |
|---|---|---|---|
| 🏗️ | `chat‑feature‑generator` | `realtime/chat-feature-generator` | The generator is organized with strict HVP layering: |
| 🏗️ | `websocket‑server‑generator` | `realtime/websocket-server-generator` | 1. Client initiates connection request. |

## 🛡️ Security (6)

_Auth, MFA, rate limiting, sanitization, secrets_

| Icon | Agent | Path | Role |
|---|---|---|---|
| 🔑 | `api‑key‑manager` | `security/api-key-manager` | — |
| 🛡️ | `global‑safety` | `security/global-safety` | The Global Safety Controller acts as the last line of defense before any action executes. It answers a single question: Is this safe to run? |
| 🧼 | `input‑sanitizer` | `security/input-sanitizer` | — |
| 🔐 | `mfa` | `security/mfa` | — |
| 🔐 | `oauth2‑provider` | `security/oauth2-provider` | This provider implements the Authorization Code flow with mandatory PKCE (Proof Key for Code Exchange), which eliminates the risk of authorization code interception attacks — es... |
| 🚧 | `rate‑limiter` | `security/rate-limiter` | Tracks exact request timestamps within a rolling time period. No boundary burst problem. |

---

## Notes

- Each agent's `orchestrator.ts` is the single entry point — it delegates to internal sub-modules.
- All 123 agents are registered in `server/agents/core/pipeline/registry/orchestrator.registry.ts` for capability-based dispatch.
- The pipeline (`server/agents/core/pipeline/orchestrator.ts`) routes incoming work to matching agents via tag-based capability matching.
- Icons are visual markers only — they don't affect runtime behavior.
