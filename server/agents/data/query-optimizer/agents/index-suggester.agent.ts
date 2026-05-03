import { transitionState } from "../state.js";
import type {
  AgentResult,
  IndexSuggestion,
  QueryAnalysis,
  QueryOptimizerState,
} from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { extractWhereColumns } from "../utils/sql-normalizer.util.js";

const SOURCE = "index-suggester";

export interface IndexSuggesterInput {
  readonly analyses: readonly QueryAnalysis[];
  readonly state: Readonly<QueryOptimizerState>;
}

function buildDdl(table: string, columns: readonly string[], indexType: "BTREE" | "HASH" | "COMPOSITE"): string {
  const idxName = `idx_${table}_${columns.join("_")}`;
  const using = indexType === "HASH" ? " USING HASH" : "";
  return `CREATE INDEX ${idxName} ON ${table} (${columns.join(", ")})${using};`;
}

export function suggestIndexes(input: IndexSuggesterInput): Readonly<AgentResult> {
  const { analyses, state } = input;
  const suggestions: IndexSuggestion[] = [];

  for (const analysis of analyses) {
    for (const table of analysis.tables) {
      if (!analysis.hasWhere) {
        suggestions.push(
          Object.freeze({
            queryId: analysis.queryId,
            table,
            columns: ["id"],
            indexType: "BTREE" as const,
            rationale: "No WHERE clause — full table scan likely. At minimum ensure primary key index exists.",
            ddl: buildDdl(table, ["id"], "BTREE"),
          }),
        );
        continue;
      }

      const whereColumns = extractWhereColumns(
        analyses.find((a) => a.queryId === analysis.queryId)?.normalizedSql ?? "",
      );

      if (whereColumns.length > 0) {
        const indexType = whereColumns.length > 1 ? "COMPOSITE" : "BTREE";
        suggestions.push(
          Object.freeze({
            queryId: analysis.queryId,
            table,
            columns: whereColumns,
            indexType,
            rationale: `WHERE clause on ${whereColumns.join(", ")} without index causes sequential scan.`,
            ddl: buildDdl(table, whereColumns, indexType),
          }),
        );
      }

      if (analysis.hasOrderBy) {
        suggestions.push(
          Object.freeze({
            queryId: analysis.queryId,
            table,
            columns: ["created_at"],
            indexType: "BTREE" as const,
            rationale: "ORDER BY without index causes filesort. Index on sort column recommended.",
            ddl: buildDdl(table, ["created_at"], "BTREE"),
          }),
        );
      }
    }
  }

  const unique = deduplicateSuggestions(suggestions);
  const log = buildLog(SOURCE, `Generated ${unique.length} index suggestion(s) from ${analyses.length} analyse(s)`);

  return {
    nextState: transitionState(state, {
      indexSuggestions: Object.freeze(unique),
      appendLog: log,
    }),
    output: Object.freeze({
      success: true,
      issues: Object.freeze([]),
      suggestions: Object.freeze([]),
      indexSuggestions: Object.freeze(unique),
      logs: Object.freeze([log]),
    }),
  };
}

function deduplicateSuggestions(suggestions: IndexSuggestion[]): readonly IndexSuggestion[] {
  const seen = new Set<string>();
  return Object.freeze(
    suggestions.filter((s) => {
      const key = `${s.table}:${s.columns.join(",")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}
