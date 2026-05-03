export interface PatternMatch {
  readonly level: "low" | "medium" | "critical";
  readonly category: "security" | "performance" | "logic";
  readonly message: string;
}

const RISK_PATTERNS = Object.freeze([
  {
    regex: /(eval\s*\(|new\s+Function\s*\()/,
    level: "critical",
    category: "security",
    message: "Dynamic code execution introduced.",
  },
  {
    regex: /(SELECT\s+\*\s+FROM\s+.*\+|\$\{.*\}\s*FROM)/i,
    level: "critical",
    category: "security",
    message: "Potential SQL injection pattern detected.",
  },
  {
    regex: /(while\s*\(true\)|for\s*\(;;\))/,
    level: "medium",
    category: "performance",
    message: "Potential unbounded loop added.",
  },
  {
    regex: /(TODO|FIXME)/,
    level: "low",
    category: "logic",
    message: "Incomplete implementation marker detected.",
  },
] as const);

export function matchRiskPatterns(line: string): readonly PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const pattern of RISK_PATTERNS) {
    if (pattern.regex.test(line)) {
      matches.push({
        level: pattern.level,
        category: pattern.category,
        message: pattern.message,
      });
    }
  }

  return Object.freeze(matches);
}
