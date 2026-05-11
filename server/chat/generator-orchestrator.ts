/**
 * server/chat/generator-orchestrator.ts
 *
 * GENERATOR ORCHESTRATOR — Single entry point for ALL generator agents.
 *
 * Architecture:
 *   server/chat/generator-orchestrator.ts  ← you are here
 *     ├── .code         → generation/code-gen
 *     ├── .backend      → generation/backend-gen/{route,controller,auth,model,
 *     │                   middleware,service,migration,api-doc,env-configurator}
 *     ├── .frontend     → generation/frontend-gen/{component,page,form,state,
 *     │                   style,test,api-client}
 *     ├── .database     → generation/database/{mongoose,prisma}
 *     ├── .graphql      → generation/graphql/{schema,resolver}
 *     ├── .routing      → generation/routing-generator
 *     ├── .pwa          → generation/pwa-gen/{service-worker,manifest,app-shell,
 *     │                   install-prompt,offline-strategy,push-notification}
 *     ├── .devops       → devops/{docker-compose,github-actions,env-pipeline}
 *     ├── .realtime     → realtime/{chat-feature,websocket-server}
 *     └── .observability → observability/{logger,health,opentelemetry,prometheus}
 *
 * RULE: Nothing outside server/chat/ needs to import generator agents directly.
 *       Use generatorOrchestrator.<namespace>.<fn>() everywhere.
 */

// ── Code Generation ──────────────────────────────────────────────────────────
import {
  generateCode,
  validateCode,
  buildStructure,
} from "../agents/generation/code-gen/index.ts";
import type {
  CodeRequest,
  GenerationResult as CodeGenResult,
  ValidationResult as CodeValidationResult,
} from "../agents/generation/code-gen/index.ts";

// ── Backend — Route Generator ─────────────────────────────────────────────────
import { generateRoutes as generateBackendRoutes } from "../agents/generation/backend-gen/route-generator/index.ts";
import type {
  RouteConfig,
  RouteResult,
  GenerateRoutesOptions,
} from "../agents/generation/backend-gen/route-generator/index.ts";

// ── Backend — Controller Generator ───────────────────────────────────────────
import { generateController } from "../agents/generation/backend-gen/controller-generator/index.ts";
import type {
  ControllerConfig,
  GeneratedController,
} from "../agents/generation/backend-gen/controller-generator/index.ts";

// ── Backend — Auth Generator ──────────────────────────────────────────────────
import {
  generateAuthModule,
  validateAuth,
  getAuthStrategy,
} from "../agents/generation/backend-gen/auth-generator/index.ts";
import type {
  AuthConfig,
  AuthModuleOutput,
  AuthStrategy,
} from "../agents/generation/backend-gen/auth-generator/index.ts";

// ── Backend — Model Generator ─────────────────────────────────────────────────
import {
  generateModel,
  validateSchema as validateModelSchema,
  getSupportedORMs,
} from "../agents/generation/backend-gen/model-generator/index.ts";

// ── Backend — Middleware Generator ────────────────────────────────────────────
import {
  generateMiddleware,
  generateAuthMiddleware,
  generateErrorMiddleware,
} from "../agents/generation/backend-gen/middleware-generator/index.ts";
import type {
  MiddlewareConfig,
  MiddlewareResult,
} from "../agents/generation/backend-gen/middleware-generator/index.ts";

// ── Backend — Service Generator ───────────────────────────────────────────────
import { generateService } from "../agents/generation/backend-gen/service-generator/index.ts";
import type {
  ServiceConfig,
  ServiceGenerationOutput,
} from "../agents/generation/backend-gen/service-generator/index.ts";

// ── Backend — Migration Generator ────────────────────────────────────────────
import {
  generateMigration,
  previewMigration,
} from "../agents/generation/backend-gen/migration-generator/index.ts";
import type {
  GenerateMigrationInput,
  GenerationResult as MigrationResult,
} from "../agents/generation/backend-gen/migration-generator/index.ts";

// ── Backend — API Docs Generator ──────────────────────────────────────────────
import {
  generateApiDocs,
  getOpenAPISpec,
} from "../agents/generation/backend-gen/api-doc-generator/index.ts";
import type {
  GenerateApiDocsInput,
  GeneratedApiDocsOutput,
} from "../agents/generation/backend-gen/api-doc-generator/index.ts";

// ── Backend — Env Configurator ────────────────────────────────────────────────
import {
  setupEnv,
  syncEnv,
  validateEnv as validateEnvConfig,
} from "../agents/generation/backend-gen/env-configurator/index.ts";
import type {
  EnvOrchestratorInput,
  EnvGenerationResult,
} from "../agents/generation/backend-gen/env-configurator/index.ts";

// ── Frontend — Component Generator ───────────────────────────────────────────
import { generateComponent } from "../agents/generation/frontend-gen/component-generator/index.ts";
import type {
  ComponentRequest,
  ComponentResult,
} from "../agents/generation/frontend-gen/component-generator/index.ts";

// ── Frontend — Page Generator ─────────────────────────────────────────────────
import {
  generatePage,
  validatePage,
  getPageStructure,
} from "../agents/generation/frontend-gen/page-generator/index.ts";
import type {
  PageSpec,
  PageResult,
} from "../agents/generation/frontend-gen/page-generator/index.ts";

// ── Frontend — Form Generator ─────────────────────────────────────────────────
import {
  generateForm,
  buildValidation,
  validateFormSchema,
} from "../agents/generation/frontend-gen/form-generator/index.ts";
import type { FormSchema } from "../agents/generation/frontend-gen/form-generator/index.ts";

// ── Frontend — State Management Generator ────────────────────────────────────
import {
  generateStateManagement,
  getSupportedLibraries,
} from "../agents/generation/frontend-gen/state-management-generator/index.ts";

// ── Frontend — Style Generator ────────────────────────────────────────────────
import { generateResponsiveStyleSystem } from "../agents/generation/frontend-gen/style-generator/index.ts";
import type {
  StyleGeneratorInput,
  StyleGeneratorResult,
} from "../agents/generation/frontend-gen/style-generator/index.ts";

// ── Frontend — Test Generator ─────────────────────────────────────────────────
import {
  generateComponentTest,
  generatePageTest,
  generateFormTest,
  generateFrontendTest,
} from "../agents/generation/frontend-gen/test-generator/index.ts";
import type {
  GenerateTestInput,
  TestResult,
} from "../agents/generation/frontend-gen/test-generator/index.ts";

// ── Frontend — API Client Generator ──────────────────────────────────────────
import { generateApiClient } from "../agents/generation/frontend-gen/api-client/index.ts";
import type {
  GenerationInput as ApiClientInput,
  GenerationResult as ApiClientResult,
} from "../agents/generation/frontend-gen/api-client/index.ts";

// ── Database — Mongoose Schema Generator ─────────────────────────────────────
import {
  generateSchema as generateMongooseSchema,
  validateSchema as validateMongooseSchema,
  optimizeSchema as optimizeMongooseSchema,
} from "../agents/generation/database/mongoose-schema-generator/index.ts";

// ── Database — Prisma Schema Generator ───────────────────────────────────────
import {
  generateSchema as generatePrismaSchema,
  validateSchema as validatePrismaSchema,
} from "../agents/generation/database/prisma-schema-generator/index.ts";

// ── GraphQL — Schema Generator ────────────────────────────────────────────────
import {
  generateSchema as generateGraphQLSchema,
  validateSchema as validateGraphQLSchema,
  getSchemaState as getGraphQLSchemaState,
} from "../agents/generation/graphql/schema-generator/index.ts";

// ── GraphQL — Resolver Generator ──────────────────────────────────────────────
import {
  generateResolvers,
  validateResolvers,
} from "../agents/generation/graphql/resolver-generator/index.ts";
import type {
  ResolverConfig,
  ResolverGeneratorOutput,
} from "../agents/generation/graphql/resolver-generator/index.ts";

// ── Routing Generator ─────────────────────────────────────────────────────────
import {
  generateRoutes as generateAppRoutes,
  validateRoutes as validateAppRoutes,
} from "../agents/generation/routing-generator/index.ts";
import type {
  GenerateRoutesInput as AppRoutesInput,
  RoutingResult,
  Route,
} from "../agents/generation/routing-generator/index.ts";

// ── PWA — Service Worker Generator ────────────────────────────────────────────
import { runServiceWorker } from "../agents/generation/pwa-gen/service-worker-generator/index.ts";

// ── PWA — Manifest Generator ──────────────────────────────────────────────────
import { generateManifest } from "../agents/generation/pwa-gen/manifest-generator/index.ts";

// ── PWA — App Shell Generator ─────────────────────────────────────────────────
import { appShellGeneratorOrchestrator } from "../agents/generation/pwa-gen/app-shell-generator/index.ts";

// ── PWA — Install Prompt ──────────────────────────────────────────────────────
import { runInstallPromptOrchestrator } from "../agents/generation/pwa-gen/install-prompt/index.ts";

// ── PWA — Offline Strategy ────────────────────────────────────────────────────
import { executeOfflineStrategy } from "../agents/generation/pwa-gen/offline-strategy/index.ts";

// ── PWA — Push Notification ───────────────────────────────────────────────────
import { runPushNotificationModule } from "../agents/generation/pwa-gen/push-notification-web/index.ts";

// ── DevOps — Docker Compose Generator ────────────────────────────────────────
import {
  generateCompose,
  validateCompose,
  getComposeServices,
} from "../agents/devops/docker-compose-generator/index.ts";
import type {
  ServiceConfig as DockerServiceConfig,
  ComposeResult,
} from "../agents/devops/docker-compose-generator/index.ts";

// ── DevOps — GitHub Actions Generator ────────────────────────────────────────
import {
  generateWorkflow,
  validateWorkflow,
  previewWorkflow,
} from "../agents/devops/github-actions-generator/index.ts";
import type {
  WorkflowConfig,
  WorkflowResult,
} from "../agents/devops/github-actions-generator/index.ts";

// ── DevOps — Env Pipeline Validator ──────────────────────────────────────────
import {
  validateEnv as validateEnvPipeline,
  getEnvReport,
} from "../agents/devops/env-pipeline-validator/index.ts";
import type {
  EnvSchema,
  EnvValidationResult,
} from "../agents/devops/env-pipeline-validator/index.ts";

// ── Realtime — Chat Feature Generator ────────────────────────────────────────
import {
  connectClient,
  generateChatFeature,
  setupRealtime,
} from "../agents/realtime/chat-feature-generator/index.ts";
import type {
  ChatFeatureOutput,
} from "../agents/realtime/chat-feature-generator/index.ts";

// ── Realtime — WebSocket Server Generator ────────────────────────────────────
import {
  startWebSocketServer,
  stopWebSocketServer,
  getActiveConnections,
} from "../agents/realtime/websocket-server-generator/index.ts";
import type { ServerConfig as WsServerConfig } from "../agents/realtime/websocket-server-generator/index.ts";

// ── Observability — Logger Setup ──────────────────────────────────────────────
import {
  initLogger,
  getLogger,
  log as logMessage,
} from "../agents/observability/logger-setup/index.ts";

// ── Observability — Health ────────────────────────────────────────────────────
import {
  getHealth,
  getReadiness,
  getLiveness,
} from "../agents/observability/health/index.ts";

// ── Observability — OpenTelemetry ─────────────────────────────────────────────
import {
  startTraceSession,
  startTraceOnly,
  endTraceOnly,
  getMetrics as getOtelMetrics,
} from "../agents/observability/opentelemetry/index.ts";

// ── Observability — Prometheus ────────────────────────────────────────────────
import {
  initMetrics,
  getMetrics as getPrometheusMetrics,
  registerMetric,
  recordRequest,
  incrementCounter,
  setGauge,
  observeHistogram,
  defineMetric,
} from "../agents/observability/prometheus-metrics/index.ts";

// ─────────────────────────────────────────────────────────────────────────────
//  GENERATOR ORCHESTRATOR CLASS
// ─────────────────────────────────────────────────────────────────────────────

class GeneratorOrchestrator {

  // ── 1. Code Generation ──────────────────────────────────────────────────────
  /**
   * Core code generation — intent → files.
   * Uses StructurePlanner → TemplateSelector → PromptBuilder → CodeWriter → Validator.
   */
  readonly code = {
    /** Generate code files from a high-level CodeRequest. */
    generate: (request: CodeRequest): Promise<CodeGenResult> =>
      generateCode(request),

    /** Validate a GenerationResult after generation. */
    validate: (result: CodeGenResult): CodeValidationResult =>
      validateCode(result),

    /** Plan file structure without running the full LLM pipeline. */
    planStructure: (request: CodeRequest): readonly string[] =>
      buildStructure(request),
  } as const;

  // ── 2. Backend Generators ───────────────────────────────────────────────────
  /**
   * All backend code generators:
   * routes, controllers, auth, models, middleware, services,
   * migrations, API docs, and env configuration.
   */
  readonly backend = {

    /** Generate Express / NestJS route files from a RouteConfig. */
    generateRoutes: (config: RouteConfig, options?: GenerateRoutesOptions): ReturnType<typeof generateBackendRoutes> =>
      generateBackendRoutes(config, options),

    /** Generate a controller class from a ControllerConfig. */
    generateController: (config: ControllerConfig): ReturnType<typeof generateController> =>
      generateController(config),

    /** Generate a full auth module (JWT / session / OAuth). */
    generateAuthModule: (config: AuthConfig): Readonly<AuthModuleOutput> =>
      generateAuthModule(config),

    /** Validate an AuthConfig before generation. */
    validateAuth: (config: AuthConfig): boolean =>
      validateAuth(config),

    /** Select auth strategy (JWT / session / OAuth) from config. */
    getAuthStrategy: (config: AuthConfig): AuthStrategy =>
      getAuthStrategy(config),

    /** Generate a database model (Prisma / Mongoose / Sequelize / TypeORM). */
    generateModel: (input: Parameters<typeof generateModel>[0]): ReturnType<typeof generateModel> =>
      generateModel(input),

    /** Validate a model schema before generation. */
    validateModelSchema: (input: Parameters<typeof validateModelSchema>[0]): ReturnType<typeof validateModelSchema> =>
      validateModelSchema(input),

    /** Return the list of supported ORMs. */
    getSupportedORMs: (): readonly string[] =>
      getSupportedORMs(),

    /** Generate Express middleware (auth, error, rate-limit, etc.). */
    generateMiddleware: (config: MiddlewareConfig): MiddlewareResult =>
      generateMiddleware(config),

    /** Generate a JWT / session auth middleware. */
    generateAuthMiddleware: (): ReturnType<typeof generateAuthMiddleware> =>
      generateAuthMiddleware(),

    /** Generate a global error-handling middleware. */
    generateErrorMiddleware: (): ReturnType<typeof generateErrorMiddleware> =>
      generateErrorMiddleware(),

    /** Generate a service class from a ServiceConfig. */
    generateService: (config: ServiceConfig): ServiceGenerationOutput =>
      generateService(config),

    /** Generate a database migration from schema changes. */
    generateMigration: (input: GenerateMigrationInput): MigrationResult =>
      generateMigration(input),

    /** Preview a migration without writing files. */
    previewMigration: (input: GenerateMigrationInput): ReturnType<typeof previewMigration> =>
      previewMigration(input),

    /** Generate OpenAPI / Swagger docs from route metadata. */
    generateApiDocs: (input: GenerateApiDocsInput): GeneratedApiDocsOutput =>
      generateApiDocs(input),

    /** Get a typed OpenAPISpec object from route metadata. */
    getOpenAPISpec: (input: GenerateApiDocsInput): ReturnType<typeof getOpenAPISpec> =>
      getOpenAPISpec(input),

    /** Set up .env files for a project (development + production). */
    setupEnv: (input: EnvOrchestratorInput): EnvGenerationResult =>
      setupEnv(input),

    /** Sync existing env files with a new schema. */
    syncEnv: (input: EnvOrchestratorInput): ReturnType<typeof syncEnv> =>
      syncEnv(input),

    /** Validate an env configuration against a schema. */
    validateEnvConfig: (input: EnvOrchestratorInput): ReturnType<typeof validateEnvConfig> =>
      validateEnvConfig(input),

  } as const;

  // ── 3. Frontend Generators ──────────────────────────────────────────────────
  /**
   * All frontend code generators:
   * components, pages, forms, state management,
   * styles, tests, and API clients.
   */
  readonly frontend = {

    /** Generate a React / Vue component from a ComponentRequest. */
    generateComponent: (request: ComponentRequest): ComponentResult =>
      generateComponent(request),

    /** Generate a full page (route + view + state wiring). */
    generatePage: (spec: PageSpec): PageResult =>
      generatePage(spec),

    /** Validate a PageSpec before generation. */
    validatePage: (spec: PageSpec): boolean =>
      validatePage(spec),

    /** Get the current page generator state. */
    getPageStructure: (): ReturnType<typeof getPageStructure> =>
      getPageStructure(),

    /** Generate a form component with validation from a FormSchema. */
    generateForm: (schema: FormSchema): ReturnType<typeof generateForm> =>
      generateForm(schema),

    /** Build Zod / Yup validation from a FormSchema. */
    buildValidation: (schema: FormSchema): ReturnType<typeof buildValidation> =>
      buildValidation(schema),

    /** Validate a FormSchema before generation. */
    validateFormSchema: (schema: FormSchema): boolean =>
      validateFormSchema(schema),

    /** Generate state management boilerplate (Redux / Zustand / Jotai / Context). */
    generateStateManagement: (input: Parameters<typeof generateStateManagement>[0]): ReturnType<typeof generateStateManagement> =>
      generateStateManagement(input),

    /** Return the list of supported state-management libraries. */
    getSupportedLibraries: (): ReturnType<typeof getSupportedLibraries> =>
      getSupportedLibraries(),

    /** Generate a complete responsive style system (tokens + utilities). */
    generateStyleSystem: (input: StyleGeneratorInput): StyleGeneratorResult =>
      generateResponsiveStyleSystem(input),

    /** Generate a component-level test (Vitest / Testing Library). */
    generateComponentTest: (input: Omit<GenerateTestInput, "preferredTestType">): Readonly<TestResult> =>
      generateComponentTest(input),

    /** Generate a page-level integration test. */
    generatePageTest: (input: Omit<GenerateTestInput, "preferredTestType">): Readonly<TestResult> =>
      generatePageTest(input),

    /** Generate a form-focused test. */
    generateFormTest: (input: Omit<GenerateTestInput, "preferredTestType">): Readonly<TestResult> =>
      generateFormTest(input),

    /** Generate any frontend test (specify type in input). */
    generateFrontendTest: (input: GenerateTestInput): Readonly<TestResult> =>
      generateFrontendTest(input),

    /** Generate a typed API client (fetch / axios) from an OpenAPI spec or endpoint list. */
    generateApiClient: (input: ApiClientInput): ApiClientResult =>
      generateApiClient(input),

  } as const;

  // ── 4. Database Generators ──────────────────────────────────────────────────
  /**
   * Database schema generators for Mongoose and Prisma.
   */
  readonly database = {

    mongoose: {
      /** Generate Mongoose schema and model files from a SchemaConfig. */
      generateSchema: (input: Parameters<typeof generateMongooseSchema>[0]): ReturnType<typeof generateMongooseSchema> =>
        generateMongooseSchema(input),

      /** Validate a Mongoose schema config. */
      validateSchema: (input: Parameters<typeof validateMongooseSchema>[0]): ReturnType<typeof validateMongooseSchema> =>
        validateMongooseSchema(input),

      /** Optimize a Mongoose schema (indexes, virtuals). */
      optimizeSchema: (input: Parameters<typeof optimizeMongooseSchema>[0]): ReturnType<typeof optimizeMongooseSchema> =>
        optimizeMongooseSchema(input),
    },

    prisma: {
      /** Generate a Prisma schema.prisma file from a GenerationInput. */
      generateSchema: (input: Parameters<typeof generatePrismaSchema>[0]): ReturnType<typeof generatePrismaSchema> =>
        generatePrismaSchema(input),

      /** Validate a Prisma schema generation input. */
      validateSchema: (input: Parameters<typeof validatePrismaSchema>[0]): ReturnType<typeof validatePrismaSchema> =>
        validatePrismaSchema(input),
    },

  } as const;

  // ── 5. GraphQL Generators ───────────────────────────────────────────────────
  /**
   * GraphQL schema and resolver generators.
   */
  readonly graphql = {

    /** Generate a full GraphQL schema (types, queries, mutations, subscriptions). */
    generateSchema: (input: Parameters<typeof generateGraphQLSchema>[0]): ReturnType<typeof generateGraphQLSchema> =>
      generateGraphQLSchema(input),

    /** Validate a GraphQL SchemaConfig. */
    validateSchema: (input: Parameters<typeof validateGraphQLSchema>[0]): ReturnType<typeof validateGraphQLSchema> =>
      validateGraphQLSchema(input),

    /** Get the current schema generator state. */
    getSchemaState: (): ReturnType<typeof getGraphQLSchemaState> =>
      getGraphQLSchemaState(),

    /** Generate typed resolvers from a ResolverConfig. */
    generateResolvers: (config: ResolverConfig): ResolverGeneratorOutput =>
      generateResolvers(config),

    /** Validate resolver implementations against a schema. */
    validateResolvers: (config: ResolverConfig): ReturnType<typeof validateResolvers> =>
      validateResolvers(config),

  } as const;

  // ── 6. Routing Generator ────────────────────────────────────────────────────
  /**
   * App-level routing generator — produces route trees for React / Next / Express.
   */
  readonly routing = {

    /** Generate app routes from an optional input config. */
    generateRoutes: (input?: AppRoutesInput): Promise<RoutingResult> =>
      generateAppRoutes(input),

    /** Validate a set of route objects. */
    validateRoutes: (routes: readonly Route[]): ReturnType<typeof validateAppRoutes> =>
      validateAppRoutes(routes),

  } as const;

  // ── 7. PWA Generators ───────────────────────────────────────────────────────
  /**
   * Progressive Web App generators:
   * service worker, manifest, app shell, install prompt,
   * offline strategy, and push notifications.
   */
  readonly pwa = {

    /** Generate and register a service worker (Workbox or vanilla). */
    generateServiceWorker: (input: Parameters<typeof runServiceWorker>[0]): ReturnType<typeof runServiceWorker> =>
      runServiceWorker(input),

    /** Generate a web app manifest (manifest.webmanifest). */
    generateManifest: (input: Parameters<typeof generateManifest>[0]): ReturnType<typeof generateManifest> =>
      generateManifest(input),

    /** Generate an app-shell (offline-first HTML skeleton). */
    generateAppShell: (input: Parameters<typeof appShellGeneratorOrchestrator>[0]): ReturnType<typeof appShellGeneratorOrchestrator> =>
      appShellGeneratorOrchestrator(input),

    /** Generate an install-prompt flow (beforeinstallprompt handler). */
    generateInstallPrompt: (input: Parameters<typeof runInstallPromptOrchestrator>[0]): ReturnType<typeof runInstallPromptOrchestrator> =>
      runInstallPromptOrchestrator(input),

    /** Generate an offline caching strategy (cache-first / network-first / stale-while-revalidate). */
    generateOfflineStrategy: (input: Parameters<typeof executeOfflineStrategy>[0]): ReturnType<typeof executeOfflineStrategy> =>
      executeOfflineStrategy(input),

    /** Generate a Web Push notification module (VAPID + subscription + payload). */
    generatePushNotifications: (input: Parameters<typeof runPushNotificationModule>[0]): ReturnType<typeof runPushNotificationModule> =>
      runPushNotificationModule(input),

  } as const;

  // ── 8. DevOps Generators ────────────────────────────────────────────────────
  /**
   * DevOps / CI-CD generators:
   * Docker Compose, GitHub Actions, and env pipeline validation.
   */
  readonly devops = {

    compose: {
      /** Generate a docker-compose.yml from service definitions. */
      generate: (input: Parameters<typeof generateCompose>[0]): ReturnType<typeof generateCompose> =>
        generateCompose(input),

      /** Validate docker-compose input before generation. */
      validate: (input: Parameters<typeof validateCompose>[0]): ReturnType<typeof validateCompose> =>
        validateCompose(input),

      /** Extract service names from a ComposeFile. */
      getServices: (file: Parameters<typeof getComposeServices>[0]): ReturnType<typeof getComposeServices> =>
        getComposeServices(file),
    },

    github: {
      /** Generate a .github/workflows/*.yml CI/CD pipeline. */
      generateWorkflow: (config: WorkflowConfig): WorkflowResult =>
        generateWorkflow(config),

      /** Validate a WorkflowConfig before generation. */
      validateWorkflow: (config: WorkflowConfig): ReturnType<typeof validateWorkflow> =>
        validateWorkflow(config),

      /** Preview workflow YAML without writing files. */
      previewWorkflow: (config: WorkflowConfig): ReturnType<typeof previewWorkflow> =>
        previewWorkflow(config),
    },

    env: {
      /** Validate environment variables against a schema and policy. */
      validatePipeline: (schema: EnvSchema): EnvValidationResult =>
        validateEnvPipeline(schema),

      /** Get a full env validation report (findings + recommendations). */
      getReport: (schema: EnvSchema): ReturnType<typeof getEnvReport> =>
        getEnvReport(schema),
    },

  } as const;

  // ── 9. Realtime Generators ──────────────────────────────────────────────────
  /**
   * Realtime feature generators:
   * chat (Socket.io / WebSocket) and WebSocket server scaffolding.
   */
  readonly realtime = {

    chat: {
      /** Generate a full chat feature (rooms, users, presence, messages). */
      generate: (input: Parameters<typeof generateChatFeature>[0]): ChatFeatureOutput =>
        generateChatFeature(input),

      /** Set up realtime transport layer for a chat feature. */
      setupTransport: (input: Parameters<typeof setupRealtime>[0]): ReturnType<typeof setupRealtime> =>
        setupRealtime(input),

      /** Register a new client connection to the chat system. */
      connectClient: (input: Parameters<typeof connectClient>[0]): ReturnType<typeof connectClient> =>
        connectClient(input),
    },

    websocket: {
      /** Start a WebSocket server with the given config. */
      start: (config: WsServerConfig): ReturnType<typeof startWebSocketServer> =>
        startWebSocketServer(config),

      /** Stop the running WebSocket server. */
      stop: (): ReturnType<typeof stopWebSocketServer> =>
        stopWebSocketServer(),

      /** Get the count of currently active WebSocket connections. */
      getActiveConnections: (): number =>
        getActiveConnections(),
    },

  } as const;

  // ── 10. Observability Generators ────────────────────────────────────────────
  /**
   * Observability generators:
   * structured logging, health checks, OpenTelemetry tracing,
   * and Prometheus metrics.
   */
  readonly observability = {

    logger: {
      /** Initialize the logger with a given state / config. */
      init: (state?: Parameters<typeof initLogger>[0]): ReturnType<typeof initLogger> =>
        initLogger(state),

      /** Get (or lazily create) the logger instance. */
      getLogger: (): ReturnType<typeof getLogger> =>
        getLogger(),

      /** Emit a structured log entry at the given level. */
      log: (
        level: "info" | "warn" | "error" | "debug",
        message: string,
        meta?: Record<string, unknown>,
        requestId?: string,
      ): void => logMessage(level, message, meta, requestId),
    },

    health: {
      /** Run a full health check (liveness + readiness + dependencies). */
      check: (options?: Parameters<typeof getHealth>[0]): ReturnType<typeof getHealth> =>
        getHealth(options),

      /** Run a readiness check (dependencies initialized). */
      readiness: (options?: Parameters<typeof getReadiness>[0]): ReturnType<typeof getReadiness> =>
        getReadiness(options),

      /** Run a liveness check (process alive). */
      liveness: (): ReturnType<typeof getLiveness> =>
        getLiveness(),
    },

    otel: {
      /** Start an OpenTelemetry trace session (service + root span). */
      startTrace: (
        service: string,
        rootSpanName: string,
        options?: Parameters<typeof startTraceSession>[2],
      ): ReturnType<typeof startTraceSession> =>
        startTraceSession(service, rootSpanName, options),

      /** Start a trace (synchronous — no export). */
      startTraceOnly: (service: string, rootSpanName: string): ReturnType<typeof startTraceOnly> =>
        startTraceOnly(service, rootSpanName),

      /** End a trace by traceId. */
      endTrace: (traceId: string): ReturnType<typeof endTraceOnly> =>
        endTraceOnly(traceId),

      /** Get all collected OpenTelemetry metrics. */
      getMetrics: (): ReturnType<typeof getOtelMetrics> =>
        getOtelMetrics(),
    },

    prometheus: {
      /** Initialize the Prometheus metrics registry. */
      init: (config?: Parameters<typeof initMetrics>[0]): ReturnType<typeof initMetrics> =>
        initMetrics(config),

      /** Scrape metrics in Prometheus exposition format. */
      scrape: (): Promise<string> =>
        getPrometheusMetrics(),

      /** Register a custom metric definition. */
      registerMetric: (config: Parameters<typeof registerMetric>[0]): void =>
        registerMetric(config),

      /** Record an HTTP request metric (method / route / status / duration). */
      recordRequest: (input: Parameters<typeof recordRequest>[0]): void =>
        recordRequest(input),

      /** Increment a named counter. */
      incrementCounter: (...args: Parameters<typeof incrementCounter>): void =>
        incrementCounter(...args),

      /** Set a named gauge value. */
      setGauge: (...args: Parameters<typeof setGauge>): void =>
        setGauge(...args),

      /** Observe a histogram sample. */
      observeHistogram: (...args: Parameters<typeof observeHistogram>): void =>
        observeHistogram(...args),

      /** Define a custom metric config ahead of first use. */
      defineMetric: (config: Parameters<typeof defineMetric>[0]): void =>
        defineMetric(config),
    },

  } as const;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Singleton export — use this everywhere
// ─────────────────────────────────────────────────────────────────────────────
export const generatorOrchestrator = new GeneratorOrchestrator();
export type { GeneratorOrchestrator };

// ─────────────────────────────────────────────────────────────────────────────
//  Re-export all generator types for convenience
// ─────────────────────────────────────────────────────────────────────────────
export type {
  // Code Gen
  CodeRequest,
  CodeGenResult,
  CodeValidationResult,
  // Backend
  RouteConfig,
  RouteResult,
  GenerateRoutesOptions,
  ControllerConfig,
  GeneratedController,
  AuthConfig,
  AuthModuleOutput,
  AuthStrategy,
  MiddlewareConfig,
  MiddlewareResult,
  ServiceConfig,
  ServiceGenerationOutput,
  GenerateMigrationInput,
  MigrationResult,
  GenerateApiDocsInput,
  GeneratedApiDocsOutput,
  EnvOrchestratorInput,
  EnvGenerationResult,
  // Frontend
  ComponentRequest,
  ComponentResult,
  PageSpec,
  PageResult,
  FormSchema,
  StyleGeneratorInput,
  StyleGeneratorResult,
  GenerateTestInput,
  TestResult,
  ApiClientInput,
  ApiClientResult,
  // GraphQL
  ResolverConfig,
  ResolverGeneratorOutput,
  // Routing
  AppRoutesInput,
  RoutingResult,
  Route,
  // DevOps
  DockerServiceConfig,
  ComposeResult,
  WorkflowConfig,
  WorkflowResult,
  EnvSchema,
  EnvValidationResult,
  // Realtime
  ChatFeatureOutput,
  WsServerConfig,
};
