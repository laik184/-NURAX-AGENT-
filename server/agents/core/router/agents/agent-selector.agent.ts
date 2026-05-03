import { Domain, Intent, AgentSelection } from "../types";
import { matchKeywords } from "../utils/keyword-matcher.util";

const MODULE_AGENT_MAP: Record<string, Record<string, string>> = {
  "backend-gen": {
    default:     "api-generator",
    graphql:     "graphql-generator",
    auth:        "auth-generator",
    controller:  "controller-generator",
    service:     "service-generator",
    model:       "model-generator",
    middleware:  "middleware-generator",
  },
  "frontend-gen": {
    default:   "component-generator",
    page:      "page-generator",
    style:     "style-generator",
    state:     "state-generator",
  },
  "mobile": {
    default:  "react-native-generator",
    ios:      "swiftui-generator",
    android:  "kotlin-generator",
  },
  "pwa-gen": {
    default: "pwa-generator",
  },
  "database": {
    default:  "schema-generator",
    prisma:   "prisma-generator",
    mongoose: "mongoose-generator",
    migration:"migration-generator",
  },
  "deploy": {
    default:  "deploy-orchestrator",
    docker:   "docker-configurator",
    rollback: "rollback-agent",
  },
  "git": {
    default: "git-agent",
  },
  "planning": {
    default:      "planner-boss",
    architecture: "architecture-planner",
    security:     "security-planner",
    testing:      "test-planner",
  },
  "optimization-intelligence": {
    default:     "performance-optimizer",
    bundle:      "payload-optimizer",
  },
  "decision-engine": {
    default: "decision-agent",
  },
  "api-key-manager": {
    default: "key-manager-agent",
  },
  "oauth2-provider": {
    default: "oauth2-agent",
  },
  "mfa": {
    default: "mfa-agent",
  },
  "input-sanitizer": {
    default: "sanitizer-agent",
  },
  "rate-limiter": {
    default: "rate-limiter-agent",
  },
  "health": {
    default: "health-agent",
  },
  "opentelemetry": {
    default: "otel-agent",
  },
  "prometheus-metrics": {
    default: "metrics-agent",
  },
  "logger-setup": {
    default: "logger-agent",
  },
  "query-optimizer": {
    default: "query-optimizer-agent",
  },
  "redis": {
    default: "redis-agent",
    pubsub:  "pubsub-agent",
    session: "session-agent",
  },
  "websocket-gen": {
    default: "websocket-generator",
    chat:    "chat-generator",
  },
  "execution": {
    default: "code-executor",
    fix:     "code-fixer",
    test:    "test-runner",
    shell:   "shell-executor",
  },
};

const AGENT_KEYWORDS: Record<string, Record<string, readonly string[]>> = {
  "backend-gen": {
    graphql:    ["graphql", "query", "mutation", "subscription", "resolver"],
    auth:       ["auth", "login", "register", "jwt", "session", "oauth"],
    controller: ["controller", "handler", "endpoint", "route"],
    service:    ["service", "business logic", "use case"],
    model:      ["model", "entity", "schema", "dto"],
    middleware: ["middleware", "interceptor", "guard", "pipe"],
  },
  "database": {
    prisma:    ["prisma"],
    mongoose:  ["mongoose", "mongodb", "mongo"],
    migration: ["migration", "migrate", "alter"],
  },
  "mobile": {
    ios:     ["ios", "swift", "swiftui", "xcode"],
    android: ["android", "kotlin", "jetpack"],
  },
  "planning": {
    architecture: ["architecture", "system design", "diagram", "structure"],
    security:     ["security plan", "threat model", "vulnerability"],
    testing:      ["test plan", "test strategy", "qa plan"],
  },
  "redis": {
    pubsub:  ["pub sub", "pubsub", "publish", "subscribe", "channel"],
    session: ["session", "user session", "persist session"],
  },
  "websocket-gen": {
    chat: ["chat", "messaging", "message", "room", "conversation"],
  },
  "execution": {
    fix:   ["fix", "bug", "error", "repair", "patch"],
    test:  ["test", "spec", "coverage", "run test"],
    shell: ["shell", "command", "cli", "bash", "script"],
  },
};

export function selectAgent(input: string, module: string, domain: Domain, intent: Intent): AgentSelection {
  const agentMap = MODULE_AGENT_MAP[module];
  if (!agentMap) {
    return Object.freeze({ agent: "unknown-agent", module, domain });
  }

  const subKeywords = AGENT_KEYWORDS[module];
  if (subKeywords) {
    const matches = matchKeywords(input, subKeywords);
    if (matches.length > 0) {
      const subKey = matches[0].key;
      const agent = agentMap[subKey] ?? agentMap["default"] ?? "unknown-agent";
      return Object.freeze({ agent, module, domain });
    }
  }

  const defaultAgent = agentMap["default"] ?? "unknown-agent";
  return Object.freeze({ agent: defaultAgent, module, domain });
}
