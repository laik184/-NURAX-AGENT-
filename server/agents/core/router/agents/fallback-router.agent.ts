import { RouterInput, RouterResult } from "../types";
import { extractKeywords } from "../utils/keyword-matcher.util";

const SAFE_FALLBACK: RouterResult = Object.freeze({
  success: true,
  domain: "intelligence",
  module: "decision-engine",
  agent: "decision-agent",
  confidence: 0.1,
  logs: Object.freeze(["[fallback] No confident route found — defaulting to decision-engine."]),
});

const KEYWORD_FALLBACKS: Array<{
  keywords: readonly string[];
  domain: string;
  module: string;
  agent: string;
}> = [
  { keywords: ["generate", "create", "build"], domain: "generation",    module: "backend-gen",   agent: "api-generator" },
  { keywords: ["fix", "bug", "error"],         domain: "core",          module: "execution",     agent: "code-fixer" },
  { keywords: ["deploy", "release"],           domain: "infrastructure",module: "deploy",        agent: "deploy-orchestrator" },
  { keywords: ["test", "spec"],                domain: "core",          module: "execution",     agent: "test-runner" },
  { keywords: ["secure", "auth", "login"],     domain: "security",      module: "oauth2-provider",agent: "oauth2-agent" },
  { keywords: ["monitor", "health", "log"],    domain: "observability", module: "health",        agent: "health-agent" },
  { keywords: ["redis", "cache", "query"],     domain: "data",          module: "query-optimizer",agent: "query-optimizer-agent" },
  { keywords: ["websocket", "chat", "socket"], domain: "realtime",      module: "websocket-gen", agent: "websocket-generator" },
];

export function fallbackRoute(input: RouterInput, reason: string): RouterResult {
  const logs: string[] = [`[fallback] Triggered: ${reason}`];
  const words = new Set(extractKeywords(input.input));

  for (const fb of KEYWORD_FALLBACKS) {
    const matched = fb.keywords.find((kw) => words.has(kw));
    if (matched) {
      logs.push(`[fallback] Loose keyword match on "${matched}" → ${fb.domain}/${fb.module}`);
      return Object.freeze({
        success: true,
        domain: fb.domain,
        module: fb.module,
        agent: fb.agent,
        confidence: 0.25,
        logs: Object.freeze(logs),
      });
    }
  }

  logs.push("[fallback] No keyword match — using safe default.");
  return Object.freeze({ ...SAFE_FALLBACK, logs: Object.freeze(logs) });
}
