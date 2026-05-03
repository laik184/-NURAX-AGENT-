import { Intent, DetectedIntent } from "../types";
import { INTENT_PATTERNS, applyPatterns } from "../utils/pattern-matcher.util";
import { extractKeywords, matchKeywords } from "../utils/keyword-matcher.util";

const INTENT_KEYWORDS: Record<string, readonly string[]> = {
  generate: ["generate", "create", "build", "scaffold", "make", "add", "write", "new"],
  analyze:  ["analyze", "analyse", "review", "audit", "inspect", "check", "scan", "evaluate"],
  fix:      ["fix", "repair", "debug", "resolve", "patch", "correct", "solve", "bug"],
  deploy:   ["deploy", "release", "publish", "ship", "launch", "push", "rollout"],
  test:     ["test", "spec", "coverage", "unit", "integration", "e2e", "qa", "validate"],
  optimize: ["optimize", "improve", "speed", "performance", "cache", "bundle", "reduce"],
  secure:   ["secure", "security", "auth", "encrypt", "protect", "sanitize", "mfa", "oauth"],
  observe:  ["monitor", "log", "trace", "metric", "alert", "observe", "health", "telemetry"],
  document: ["document", "docs", "readme", "comment", "explain", "describe"],
  data:     ["database", "db", "query", "redis", "cache", "sql", "mongo", "prisma", "orm"],
  realtime: ["websocket", "realtime", "socket", "chat", "stream", "live", "broadcast"],
};

export function detectIntent(input: string): DetectedIntent {
  const patternResults = applyPatterns(input, INTENT_PATTERNS);
  const keywordResults = matchKeywords(input, INTENT_KEYWORDS);
  const extractedWords = extractKeywords(input);

  const scores = new Map<string, number>();

  for (const pr of patternResults) {
    scores.set(pr.key, (scores.get(pr.key) ?? 0) + pr.totalWeight);
  }
  for (const kr of keywordResults) {
    scores.set(kr.key, (scores.get(kr.key) ?? 0) + kr.matchCount * 2);
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return Object.freeze({
      intent: "unknown" as Intent,
      keywords: Object.freeze(extractedWords.slice(0, 5)),
      confidence: 0,
    });
  }

  const [topIntent, topScore] = sorted[0];
  const maxPossibleScore = 20;
  const confidence = Math.min(topScore / maxPossibleScore, 1);

  const matchedKeywords = keywordResults.find((r) => r.key === topIntent)?.matched ?? [];

  return Object.freeze({
    intent: topIntent as Intent,
    keywords: Object.freeze(matchedKeywords.slice(0, 5)),
    confidence: Math.round(confidence * 100) / 100,
  });
}
