# Database Query Optimizer

HVP-compliant database query optimization engine for detecting slow queries, N+1 patterns, missing indexes, and generating actionable recommendations.

---

## Architecture Layers

```
L0  →  types.ts, state.ts          (shared contracts — no upward imports)
L1  →  orchestrator.ts             (routing + pipeline only, no logic)
L2  →  agents/                     (one job each — import L0 + L3 only)
L3  →  utils/                      (pure helpers — no agent imports)
```

**Import direction:** L1 → L2 → L3 → L0. No agent-to-agent imports. No external side effects.

---

## Optimization Pipeline Flow

```
caller
  └─ orchestrator.optimizeQueries(queries)
       │
       ├─ 1. query-analyzer        → parse SQL structure, estimate cost
       │       query-parser.util → sql-normalizer.util → cost-estimator.util
       │
       ├─ 2. slow-query-detector   → flag queries above threshold (default 200ms)
       │       cost-estimator.util
       │
       ├─ 3. n-plus-one-detector   → group similar queries, detect repetition
       │       pattern-matcher.util → sql-normalizer.util
       │
       ├─ 4. execution-plan-analyzer → simulate EXPLAIN plan, flag table scans
       │       cost-estimator.util
       │
       ├─ 5. index-suggester        → derive CREATE INDEX DDL from WHERE/ORDER BY
       │       sql-normalizer.util
       │
       └─ 6. optimization-recommender → merge all findings → final suggestions
               cost-estimator.util
```

---

## File Responsibilities

| File | Layer | Responsibility |
|---|---|---|
| `types.ts` | L0 | All interfaces: `Query`, `QueryAnalysis`, `OptimizationIssue`, `IndexSuggestion`, `OptimizationReport`, state types |
| `state.ts` | L0 | Frozen `INITIAL_STATE` + pure `transitionState` |
| `orchestrator.ts` | L1 | Input validation, pipeline sequencing, report assembly |
| `agents/query-analyzer.agent.ts` | L2 | Parse SQL structure (type, tables, clauses, cost) |
| `agents/slow-query-detector.agent.ts` | L2 | Flag queries exceeding the ms threshold |
| `agents/n-plus-one-detector.agent.ts` | L2 | Group similar patterns, detect repetition |
| `agents/execution-plan-analyzer.agent.ts` | L2 | Simulate EXPLAIN plan nodes, flag full table scans and Cartesian joins |
| `agents/index-suggester.agent.ts` | L2 | Generate `CREATE INDEX` DDL from WHERE / ORDER BY analysis |
| `agents/optimization-recommender.agent.ts` | L2 | Merge all issues and indexes → prioritised textual recommendations |
| `utils/query-parser.util.ts` | L3 | `parseQuery`, `analyzeQueryStructure`, `parseQueryBatch` |
| `utils/sql-normalizer.util.ts` | L3 | `normalizeSql`, `detectQueryType`, `extractTables`, `extractWhereColumns`, `hasClause`, `generateQueryId` |
| `utils/cost-estimator.util.ts` | L3 | Cost scoring, slow-query threshold, improvement % calculation |
| `utils/pattern-matcher.util.ts` | L3 | Levenshtein similarity, N+1 group detection |
| `utils/logger.util.ts` | L3 | Timestamped log and error string builders |
| `index.ts` | — | Public API surface |

---

## Output Format

Every agent and the orchestrator return a frozen `AgentResult`:

```ts
{
  nextState: Readonly<QueryOptimizerState>,
  output: Readonly<OptimizationReport>
}

// OptimizationReport shape:
{
  success: boolean,
  issues: readonly OptimizationIssue[],
  suggestions: readonly OptimizationRecommendation[],
  indexSuggestions: readonly IndexSuggestion[],
  logs: readonly string[],
  error?: string
}
```

---

## Example Optimization Case

**Input queries (Node.js + ORM producing N+1):**

```ts
const report = getOptimizationReport(
  [
    "SELECT * FROM users WHERE id = $1",   // executed 50×
    "SELECT * FROM orders WHERE id = $1",  // executed 50×
    "SELECT * FROM users",                 // no WHERE, slow
  ],
  [5, 5, 450],
);
```

**Pipeline result:**

| Step | Finding |
|---|---|
| query-analyzer | 3 queries parsed; `users` SELECT has no WHERE clause, cost=6.0 |
| slow-query-detector | `SELECT * FROM users` at 450ms — CRITICAL |
| n-plus-one-detector | 50 identical `users` queries and 50 `orders` queries — N+1 |
| execution-plan-analyzer | SEQ SCAN on `users` (no WHERE), CARTESIAN risk on `orders` |
| index-suggester | `CREATE INDEX idx_users_id ON users (id);` `CREATE INDEX idx_orders_id ON orders (id);` |
| optimization-recommender | "Batch related queries or use eager-loading. Add indexes. Paginate full-table SELECT." |

---

## HVP Compliance Checklist

- [x] Only downward imports (L1 → L2 → L3 → L0)
- [x] No agent-to-agent imports
- [x] One responsibility per agent
- [x] All outputs `Object.freeze`d
- [x] State transitions via pure `transitionState`
- [x] No DB side effects — pure analysis engine
- [x] Orchestrator contains zero business logic
