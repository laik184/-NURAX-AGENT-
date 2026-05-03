import type { QueryType } from "../types.js";

const PARAM_PATTERN = /(\$\d+|'[^']*'|\d+(?:\.\d+)?)/g;
const WHITESPACE_PATTERN = /\s+/g;

export function normalizeSql(sql: string): string {
  return sql
    .replace(PARAM_PATTERN, "?")
    .replace(WHITESPACE_PATTERN, " ")
    .trim()
    .toUpperCase();
}

export function detectQueryType(sql: string): QueryType {
  const upper = sql.trimStart().toUpperCase();
  if (upper.startsWith("SELECT")) return "SELECT";
  if (upper.startsWith("INSERT")) return "INSERT";
  if (upper.startsWith("UPDATE")) return "UPDATE";
  if (upper.startsWith("DELETE")) return "DELETE";
  return "UNKNOWN";
}

export function extractTables(sql: string): readonly string[] {
  const upper = sql.toUpperCase();
  const tables: string[] = [];

  const fromMatches = upper.matchAll(/FROM\s+([a-z_][a-z0-9_]*)/gi);
  for (const match of fromMatches) {
    if (match[1]) tables.push(match[1].toLowerCase());
  }

  const joinMatches = upper.matchAll(/JOIN\s+([a-z_][a-z0-9_]*)/gi);
  for (const match of joinMatches) {
    if (match[1]) tables.push(match[1].toLowerCase());
  }

  const updateMatches = upper.matchAll(/UPDATE\s+([a-z_][a-z0-9_]*)/gi);
  for (const match of updateMatches) {
    if (match[1]) tables.push(match[1].toLowerCase());
  }

  return Object.freeze([...new Set(tables)]);
}

export function extractWhereColumns(sql: string): readonly string[] {
  const columns: string[] = [];
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/is);
  if (!whereMatch || !whereMatch[1]) return Object.freeze([]);

  const colMatches = whereMatch[1].matchAll(/([a-z_][a-z0-9_]*)\s*(?:=|>|<|>=|<=|!=|LIKE|IN)/gi);
  for (const match of colMatches) {
    if (match[1]) columns.push(match[1].toLowerCase());
  }
  return Object.freeze([...new Set(columns)]);
}

export function hasClause(sql: string, clause: string): boolean {
  return new RegExp(`\\b${clause}\\b`, "i").test(sql);
}

export function generateQueryId(sql: string): string {
  let hash = 0;
  for (let i = 0; i < sql.length; i++) {
    const char = sql.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `q_${Math.abs(hash).toString(16)}`;
}
