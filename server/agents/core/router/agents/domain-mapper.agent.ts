import { Intent, Domain, DomainMapping } from "../types";
import { DOMAIN_PATTERNS, applyPatterns } from "../utils/pattern-matcher.util";
import { matchKeywords } from "../utils/keyword-matcher.util";

const INTENT_TO_DOMAIN: Record<Intent, { domain: Domain; module: string }> = {
  generate: { domain: "generation",     module: "backend-gen" },
  analyze:  { domain: "intelligence",   module: "decision-engine" },
  fix:      { domain: "core",           module: "execution" },
  deploy:   { domain: "infrastructure", module: "deploy" },
  test:     { domain: "core",           module: "execution" },
  optimize: { domain: "intelligence",   module: "optimization-intelligence" },
  secure:   { domain: "security",       module: "api-key-manager" },
  observe:  { domain: "observability",  module: "health" },
  document: { domain: "intelligence",   module: "decision-engine" },
  data:     { domain: "data",           module: "query-optimizer" },
  realtime: { domain: "realtime",       module: "websocket-gen" },
  unknown:  { domain: "unknown",        module: "unknown" },
};

const MODULE_KEYWORDS: Record<string, readonly string[]> = {
  "backend-gen":                ["api", "rest", "graphql", "endpoint", "controller", "route", "server", "express"],
  "frontend-gen":               ["component", "ui", "page", "react", "vue", "angular", "css", "style", "button"],
  "mobile":                     ["mobile", "ios", "android", "swift", "kotlin", "expo", "react native"],
  "pwa-gen":                    ["pwa", "service worker", "manifest", "offline", "progressive web"],
  "database":                   ["schema", "model", "migration", "mongoose", "prisma", "orm", "entity"],
  "deploy":                     ["docker", "container", "deploy", "kubernetes", "infra", "rollback"],
  "git":                        ["git", "commit", "branch", "merge", "diff", "version control"],
  "planning":                   ["plan", "architecture", "design", "strategy", "structure", "roadmap"],
  "optimization-intelligence":  ["optimize", "performance", "bundle", "cache", "speed", "slow"],
  "decision-engine":            ["analyze", "evaluate", "decide", "assess", "review"],
  "api-key-manager":            ["api key", "secret", "token", "credential", "key rotation"],
  "oauth2-provider":            ["oauth", "oauth2", "sso", "social login"],
  "mfa":                        ["mfa", "two factor", "2fa", "totp"],
  "input-sanitizer":            ["sanitize", "xss", "injection", "validate input"],
  "rate-limiter":               ["rate limit", "throttle", "ddos", "quota"],
  "health":                     ["health", "uptime", "ping", "liveness", "readiness"],
  "opentelemetry":              ["opentelemetry", "otel", "trace", "span", "distributed"],
  "prometheus-metrics":         ["prometheus", "metric", "gauge", "counter", "histogram"],
  "logger-setup":               ["log", "logger", "winston", "pino", "logging"],
  "query-optimizer":            ["query", "sql", "index", "slow query", "explain"],
  "redis":                      ["redis", "cache", "pub sub", "session", "queue"],
  "websocket-gen":              ["websocket", "socket", "realtime", "chat", "live"],
};

export function mapDomain(input: string, intent: Intent): DomainMapping {
  const patternResults = applyPatterns(input, DOMAIN_PATTERNS);
  const keywordResults = matchKeywords(input, MODULE_KEYWORDS);

  if (patternResults.length > 0 || keywordResults.length > 0) {
    const patternTop = patternResults[0];
    const keywordTop = keywordResults[0];

    const resolvedModule = keywordTop?.key ?? (patternTop ? resolveModuleFromPattern(patternTop.key) : null);

    if (resolvedModule) {
      const domain = resolveDomainFromModule(resolvedModule);
      return Object.freeze({
        domain,
        module: resolvedModule,
        reason: `Pattern/keyword match: module="${resolvedModule}" domain="${domain}"`,
      });
    }
  }

  const fallback = INTENT_TO_DOMAIN[intent] ?? INTENT_TO_DOMAIN["unknown"];
  return Object.freeze({
    domain: fallback.domain,
    module: fallback.module,
    reason: `Intent-based fallback: intent="${intent}" → domain="${fallback.domain}"`,
  });
}

function resolveModuleFromPattern(patternKey: string): string {
  const parts = patternKey.split("/");
  return parts.length > 1 ? parts[1] : patternKey;
}

function resolveDomainFromModule(module: string): Domain {
  const map: Record<string, Domain> = {
    "backend-gen":               "generation",
    "frontend-gen":              "generation",
    "mobile":                    "generation",
    "pwa-gen":                   "generation",
    "database":                  "generation",
    "deploy":                    "infrastructure",
    "git":                       "infrastructure",
    "planning":                  "intelligence",
    "optimization-intelligence": "intelligence",
    "decision-engine":           "intelligence",
    "api-key-manager":           "security",
    "oauth2-provider":           "security",
    "mfa":                       "security",
    "input-sanitizer":           "security",
    "rate-limiter":              "security",
    "health":                    "observability",
    "opentelemetry":             "observability",
    "prometheus-metrics":        "observability",
    "logger-setup":              "observability",
    "query-optimizer":           "data",
    "redis":                     "data",
    "websocket-gen":             "realtime",
    "execution":                 "core",
  };
  return map[module] ?? "unknown";
}
