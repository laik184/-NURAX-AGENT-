export interface PatternRule {
  readonly pattern: RegExp;
  readonly key: string;
  readonly weight: number;
}

export const INTENT_PATTERNS: readonly PatternRule[] = Object.freeze([
  { pattern: /\b(generate|create|build|scaffold|make|add|write)\b/i, key: "generate", weight: 10 },
  { pattern: /\b(analyze|analyse|review|audit|inspect|check|scan)\b/i, key: "analyze", weight: 10 },
  { pattern: /\b(fix|repair|debug|resolve|patch|correct|solve)\b/i, key: "fix", weight: 10 },
  { pattern: /\b(deploy|release|publish|ship|launch|push)\b/i, key: "deploy", weight: 10 },
  { pattern: /\b(test|spec|coverage|unit|integration|e2e|qa)\b/i, key: "test", weight: 9 },
  { pattern: /\b(optimize|improve|speed|performance|cache|bundle)\b/i, key: "optimize", weight: 9 },
  { pattern: /\b(secure|security|auth|encrypt|protect|sanitize|mfa)\b/i, key: "secure", weight: 9 },
  { pattern: /\b(monitor|log|trace|metric|alert|observe|health)\b/i, key: "observe", weight: 8 },
  { pattern: /\b(document|docs|readme|comment|explain)\b/i, key: "document", weight: 7 },
  { pattern: /\b(database|db|query|redis|cache|sql|mongo|prisma)\b/i, key: "data", weight: 8 },
  { pattern: /\b(websocket|realtime|socket|chat|stream|live)\b/i, key: "realtime", weight: 8 },
]);

export const DOMAIN_PATTERNS: readonly PatternRule[] = Object.freeze([
  { pattern: /\b(api|rest|graphql|endpoint|controller|route|backend|server)\b/i, key: "generation/backend-gen", weight: 10 },
  { pattern: /\b(component|ui|page|frontend|react|vue|angular|css|style)\b/i, key: "generation/frontend-gen", weight: 10 },
  { pattern: /\b(mobile|ios|android|react native|swift|kotlin|expo)\b/i, key: "generation/mobile", weight: 10 },
  { pattern: /\b(pwa|service worker|manifest|offline|progressive)\b/i, key: "generation/pwa-gen", weight: 9 },
  { pattern: /\b(schema|model|migration|mongoose|prisma|orm)\b/i, key: "generation/database", weight: 9 },
  { pattern: /\b(docker|container|kubernetes|ci|cd|github actions|compose)\b/i, key: "devops", weight: 10 },
  { pattern: /\b(plan|architecture|design|strategy|structure)\b/i, key: "intelligence/planning", weight: 9 },
  { pattern: /\b(security|mfa|oauth|jwt|token|encrypt|sanitize)\b/i, key: "security", weight: 10 },
  { pattern: /\b(opentelemetry|prometheus|health|metric|trace|log)\b/i, key: "observability", weight: 10 },
  { pattern: /\b(redis|query|database|cache|session|sql)\b/i, key: "data", weight: 9 },
  { pattern: /\b(websocket|chat|realtime|socket|stream)\b/i, key: "realtime", weight: 9 },
  { pattern: /\b(git|version|commit|branch|merge|diff)\b/i, key: "infrastructure/git", weight: 9 },
  { pattern: /\b(deploy|release|rollback|container|infra)\b/i, key: "infrastructure/deploy", weight: 9 },
]);

export function applyPatterns(
  input: string,
  patterns: readonly PatternRule[]
): { key: string; weight: number; totalWeight: number }[] {
  const scores = new Map<string, number>();

  for (const rule of patterns) {
    if (rule.pattern.test(input)) {
      scores.set(rule.key, (scores.get(rule.key) ?? 0) + rule.weight);
    }
  }

  return [...scores.entries()]
    .map(([key, totalWeight]) => {
      const rule = patterns.find((r) => r.key === key);
      return { key, weight: rule?.weight ?? 0, totalWeight };
    })
    .sort((a, b) => b.totalWeight - a.totalWeight);
}

export function topPatternMatch(
  input: string,
  patterns: readonly PatternRule[]
): { key: string; totalWeight: number } | null {
  const results = applyPatterns(input, patterns);
  return results.length > 0 ? results[0] : null;
}
