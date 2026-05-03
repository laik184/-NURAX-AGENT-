# Global Governor Module

**Path:** `server/agents/core/orchestration/global-governor/`  
**Layer:** L1 Orchestrated Pipeline (HVP-compliant)  
**Purpose:** Supreme decision authority of the entire agent system. Receives multiple competing decisions from any module, resolves conflicts, scores every candidate across three axes, selects the single best execution path, enforces safety invariants, and returns one final frozen directive.

---

## 1. Module Purpose

When multiple system modules (recovery, planning, decision-engine, self-improvement, router, etc.) produce competing decisions simultaneously, the Global Governor is the single point of resolution. It guarantees:

- **One output** — always exactly one final decision or a hard failure with reason
- **No ambiguity** — composite scoring is deterministic and reproducible
- **No unsafe execution** — destructive or low-confidence decisions are blocked
- **Full audit trail** — every evaluation step is logged with scores

---

## 2. Flow Diagram

```
GovernorInput { decisions[], sessionId, allowDestructive, minConfidence }
        │
        ▼
decision-normalizer    ─── coerce all fields, fill gaps, normalize 0–1 scale
        │
        ▼
conflict-detector      ─── pairwise scan: action-clash, target-clash, priority-clash, risk-clash
        │
        ▼
priority-evaluator  ┐
risk-evaluator      ├── parallel evaluation of all 3 axes per decision
confidence-evaluator┘
        │
        ▼
arbitration            ─── composite score (priority 35% + risk 35% + confidence 30%) → sorted
        │
        ▼
safety-enforcer        ─── check top candidate: destructive flag, confidence floor, risk level
        │                   if blocked → try next candidate in score order
        ▼
finalizer              ─── assemble frozen GovernorOutput with rationale
        │
        ▼
state.recordSession    ─── persist immutable session record (capped at 100)
        │
        ▼
GovernorOutput { success, logs, data: { finalDecision, conflicts, scores, blockedDecisions, rationale } }
```

---

## 3. Agent Responsibilities

### `decision-normalizer.agent.ts`
**Input:** `Decision[]`  
**Output:** `NormalizedDecision[]`  
Coerces every field into a valid, typed value. Generates IDs for any missing ones. Clamps confidence to [0,1]. Computes `normalizedPriority` relative to the max priority in the current batch. Rejects the entire batch if empty.

---

### `conflict-detector.agent.ts`
**Input:** `NormalizedDecision[]`  
**Output:** `Conflict[]`  
Performs O(n²) pairwise scan across 4 conflict rule types:
- **action-clash** — execute vs abort, retry vs abort, optimize vs refactor, cache vs refactor
- **target-clash** — same target, different actions
- **priority-clash** — identical normalized priority, different actions
- **risk-clash** — ≥3 risk-level gap on same target

Conflicts are metadata only — they do not eliminate candidates. Arbitration resolves them.

---

### `priority-evaluator.agent.ts`
**Input:** `NormalizedDecision[]`  
**Output:** `Map<id, priorityScore>`  
4-factor weighted composite:
- `normalizedPriority` × 0.35
- `sourceAuthority` × 0.30 (recovery=1.0 → external=0.50)
- `actionUrgency` × 0.25 (abort=1.0 → defer=0.40)
- `recency` × 0.10 (decays linearly over 60 minutes)

---

### `risk-evaluator.agent.ts`
**Input:** `NormalizedDecision[]`  
**Output:** `Map<id, riskScore>`  
Higher score = safer decision. 3-factor composite:
- `baseRiskScore` × 0.45 (none=1.0 → critical=0.05)
- `actionModifier` × 0.30 (defer=0.95, cache=0.90 ... abort=0.10)
- `sourceTrust` × 0.25 (recovery=0.95 → external=0.50)
- Destructive penalty: −0.25 if `isDestructive=true`

---

### `confidence-evaluator.agent.ts`
**Input:** `NormalizedDecision[]`  
**Output:** `Map<id, confidenceScore>`  
4-factor composite:
- `rawConfidence` × 0.60
- `payloadCompleteness` × 0.20 (keys present in payload)
- `freshness` × 0.15 (linear decay over 30 minutes)
- `metadataBonus` × 0.05

---

### `arbitration.agent.ts`
**Input:** `NormalizedDecision[]` + 3 score maps  
**Output:** `EvaluationScore[]` (sorted) + `selectedDecision`  
Computes final composite per decision:
```
composite = priority × 0.35 + risk × 0.35 + confidence × 0.30
```
Sorts descending. Returns ranked `EvaluationScore[]` so safety-enforcer can fall back to rank 2, 3, etc.

---

### `safety-enforcer.agent.ts`
**Input:** One candidate `NormalizedDecision` + all decisions + flags  
**Output:** `allowed: boolean` + reason if blocked  
Blocks a decision if ANY of:
1. `isDestructive=true` and `allowDestructive=false`
2. `normalizedConfidence < max(0.25, minConfidenceThreshold)`
3. High-risk actions (abort/escalate) at high/critical risk without `allowDestructive`
4. `riskLevel === "critical"` without `allowDestructive`
5. Conflicting destructive decision on the same target

Called per candidate in score order until one passes.

---

### `finalizer.agent.ts`
**Input:** selected decision + all metadata  
**Output:** `GovernorOutput` (frozen)  
Strips normalized fields from output (returns plain `Decision`). Builds human-readable `rationale` string. Deep-freezes the entire output object tree.

---

## 4. Call Graph

```
orchestrator.ts
  ├── decision-normalizer.agent.ts
  │     └── utils/scoring.util.ts
  │     └── utils/logger.util.ts
  ├── conflict-detector.agent.ts
  │     └── utils/logger.util.ts
  ├── priority-evaluator.agent.ts
  │     └── utils/scoring.util.ts
  │     └── utils/logger.util.ts
  ├── risk-evaluator.agent.ts
  │     └── utils/scoring.util.ts
  │     └── utils/logger.util.ts
  ├── confidence-evaluator.agent.ts
  │     └── utils/scoring.util.ts
  │     └── utils/logger.util.ts
  ├── arbitration.agent.ts
  │     └── utils/scoring.util.ts
  │     └── utils/logger.util.ts
  ├── safety-enforcer.agent.ts
  │     └── utils/logger.util.ts
  ├── finalizer.agent.ts
  │     └── utils/deep-freeze.util.ts
  │     └── utils/logger.util.ts
  └── state.ts
```

No agent imports another agent. No circular dependencies.

---

## 5. Example Input / Output

### Single decision
```typescript
govern({
  sessionId: "sess-001",
  decisions: [{
    id: "d1",
    source: "recovery",
    action: "retry",
    target: "auth-service",
    payload: { maxAttempts: 3 },
    confidence: 0.92,
    priority: 80,
    riskLevel: "low",
    isDestructive: false,
    timestamp: Date.now(),
    metadata: { triggeredBy: "timeout" },
  }],
  allowDestructive: false,
  minConfidenceThreshold: 0.5,
});
// → { success: true, data: { finalDecision: { action: "retry", ... }, conflicts: [], ... } }
```

### Conflicting decisions
```typescript
govern({
  sessionId: "sess-002",
  decisions: [
    { id: "d1", source: "recovery", action: "execute", target: "db-service", confidence: 0.85, priority: 90, riskLevel: "low", isDestructive: false, ... },
    { id: "d2", source: "decision-engine", action: "abort", target: "db-service", confidence: 0.70, priority: 85, riskLevel: "medium", isDestructive: true, ... },
  ],
  allowDestructive: false,
});
// d2 blocked (destructive, no allowDestructive)
// d1 selected → { success: true, data: { finalDecision: d1, conflicts: [{type:"action-clash",...}], blockedDecisions: ["d2"] } }
```

### All blocked
```typescript
govern({
  sessionId: "sess-003",
  decisions: [{ id: "d1", confidence: 0.1, riskLevel: "critical", isDestructive: true, ... }],
  allowDestructive: false,
  minConfidenceThreshold: 0.5,
});
// → { success: false, error: "all 1 decision(s) blocked by safety enforcer" }
```

---

## 6. Safety Rules

| Rule | Default | Override |
|------|---------|----------|
| Destructive actions blocked | `true` | `allowDestructive: true` |
| Minimum confidence floor | 0.25 | `minConfidenceThreshold` (max of 0.25 and provided value) |
| Critical risk blocked | `true` | `allowDestructive: true` |
| High-risk abort/escalate | `true` | `allowDestructive: true` |
| Conflicting destructive on same target | `true` | `allowDestructive: true` |

Safety failures cascade: if rank-1 decision is blocked, rank-2 is tried, and so on. If all are blocked, the module returns `success: false` — it never silently falls back to an unsafe choice.

---

## 7. Performance Notes

- **Synchronous pipeline** — no async/await, no I/O. Typical wall-clock < 3ms for 10 decisions.
- **Conflict detection** — O(n²) pairwise; for n=10 that is 45 pairs. Negligible at normal decision batch sizes (1–20).
- **Evaluation** — three independent map passes over n decisions, O(n) each.
- **Arbitration** — sort of n scores: O(n log n).
- **Safety fallback** — worst case iterates all n decisions in score order; still O(n).
- **State history** — session log capped at 100 entries; no unbounded growth.
- **Output immutability** — `deepFreeze` is called once on the final output object; recursive but shallow for typical payloads.
