import type { Query, QueryAnalysis } from "../types.js";
import {
  normalizeSql,
  detectQueryType,
  extractTables,
  hasClause,
  generateQueryId,
} from "./sql-normalizer.util.js";
import { estimateQueryCost } from "./cost-estimator.util.js";

export function parseQuery(sql: string, executionTimeMs = 0): Query {
  return Object.freeze({
    id: generateQueryId(sql),
    sql,
    executionTimeMs,
    timestamp: Date.now(),
  });
}

export function analyzeQueryStructure(query: Query): QueryAnalysis {
  const { sql } = query;
  const normalizedSql = normalizeSql(sql);
  const type = detectQueryType(sql);
  const tables = extractTables(sql);
  const hasWhere = hasClause(sql, "WHERE");
  const hasJoin = hasClause(sql, "JOIN");
  const hasOrderBy = hasClause(sql, "ORDER BY");
  const hasGroupBy = hasClause(sql, "GROUP BY");
  const hasSubquery = /\(\s*SELECT/i.test(sql);

  const estimatedCost = estimateQueryCost({
    type,
    tables,
    hasWhere,
    hasJoin,
    hasOrderBy,
    hasGroupBy,
    hasSubquery,
  });

  return Object.freeze({
    queryId: query.id,
    normalizedSql,
    type,
    tables,
    hasWhere,
    hasJoin,
    hasOrderBy,
    hasGroupBy,
    hasSubquery,
    estimatedCost,
  });
}

export function parseQueryBatch(sqls: readonly string[], executionTimesMs?: readonly number[]): readonly Query[] {
  return Object.freeze(
    sqls.map((sql, i) => parseQuery(sql, executionTimesMs?.[i] ?? 0)),
  );
}
