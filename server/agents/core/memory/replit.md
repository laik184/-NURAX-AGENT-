# Memory Engine — server/agents/core/memory/

## Purpose

This module is the persistent memory system of the AI platform. It gives the system the ability to store, filter, recall, learn from, and automatically clean its own knowledge over time. Without this engine, every session starts blank. With it, the system accumulates intelligence across interactions.

---

## Flow

```
Input → Score → Filter → Classify → Deduplicate → Write → [Clean Cycle] → Retrieve
```

Step by step:

1. **Input** arrives as a `MemoryInput` object (content, context, tags, session, success/failure flags).
2. **Score** — the scorer computes an importance score (0–100) across four axes.
3. **Filter** — decides whether to SAVE or IGNORE using score, patterns, and critical failure rules.
4. **Classify** — determines which bucket the memory belongs to: short-term, long-term, or pattern.
5. **Deduplicate** — computes similarity against existing items; blocks storage if a near-duplicate exists.
6. **Write** — stores the frozen `MemoryItem` into the appropriate state bucket.
7. **Clean Cycle** — periodically applies decay, expires short-term entries, removes low-score items.
8. **Retrieve** — on-demand context-based or tag-based ranked retrieval.

---

## File Responsibilities

### L0 — Foundation

| File | Responsibility |
|------|----------------|
| `types.ts` | All shared type definitions. No logic. |
| `state.ts` | In-memory state container. All mutations produce new frozen state. No business logic. |

### L1 — Coordination

| File | Responsibility |
|------|----------------|
| `orchestrator.ts` | Coordinates the full flow. Calls agents in order. No business logic of its own. |

### L2 — Agents (Isolated Logic)

| File | Responsibility |
|------|----------------|
| `agents/memory-scorer.agent.ts` | Computes importance scores (0–100) from success, repetition, complexity, rarity axes. |
| `agents/memory-filter.agent.ts` | Decides SAVE or IGNORE using score threshold, pattern detection, and critical failure override. |
| `agents/memory-classifier.agent.ts` | Classifies memory as short-term, long-term, or pattern based on score and metadata. |
| `agents/memory-deduplicator.agent.ts` | Computes cosine + Jaccard similarity to detect and block near-duplicate storage. |
| `agents/memory-writer.agent.ts` | Creates a frozen `MemoryItem` and commits it to state. |
| `agents/memory-retriever.agent.ts` | Retrieves items by context similarity, tags, type, and session filters. Updates access counts. |
| `agents/memory-cleaner.agent.ts` | Expires short-term items by TTL, applies decay to long-term/pattern scores, removes below-threshold. |
| `agents/memory-learning.agent.ts` | Groups similar history items, extracts new patterns, reinforces existing ones. |

### L3 — Pure Utilities

| File | Responsibility |
|------|----------------|
| `utils/scoring.util.ts` | Pure scoring math for all four score axes. |
| `utils/decay.util.ts` | Time-based decay formulas, TTL checks, threshold constants. |
| `utils/similarity.util.ts` | Cosine similarity, Jaccard similarity, combined similarity, tokenization. |
| `utils/deep-freeze.util.ts` | Recursively Object.freeze() any object. |

---

## Memory Types

### short-term
- Session-scoped data.
- Expires after 30 minutes.
- Low barrier to entry.
- Never promoted automatically (re-processed on next session if relevant).

### long-term
- Important, high-scoring knowledge that persists indefinitely.
- Subject to slow decay (2% per day interval) if not accessed.
- Score must reach 65+ or be explicitly a successful operation.

### pattern
- Reusable intelligence extracted from repeated similar inputs.
- Scored boosts when the same pattern recurs.
- Decay rate is lower (0.5% per day interval) — patterns age well.
- Identified by a `patternKey` derived from content tokens.

---

## Scoring System

Each memory input receives a score from 0–100 built from four independent components:

| Axis | Max Points | Logic |
|------|-----------|-------|
| **Success** | 30 | Full score for success; 80% for failure (failures are still valuable); 40% for neutral |
| **Repetition** | 25 | Scales with number of similar prior items seen (capped at 10) |
| **Complexity** | 25 | Based on content length; longer/richer inputs score higher |
| **Rarity** | 20 | Sparse or unique inputs (few similar items) score higher; boosted by tag count |

**Save threshold:** score ≥ 30

**Override rules that bypass the threshold:**
- Critical failure keywords detected (crash, fatal, panic, etc.) → always save
- Repeated pattern (2+ similar items) → always save
- Duplicate (similarity ≥ 0.85) → always ignore

---

## Example

### Input saved to long-term:
```
Input: {
  id: "op-991",
  content: "Successfully deployed auth service with JWT refresh token rotation and Redis session store",
  success: true,
  tags: ["auth", "deployment", "redis"],
  timestamp: <now>
}

Score: success=30, repetition=0, complexity=18, rarity=20 → total=68
Filter: SAVE (score 68 > threshold 30)
Classification: long-term (score ≥ 65)
Written to: state.longTerm
```

### Input ignored:
```
Input: {
  id: "op-992",
  content: "temp test",
  timestamp: <now>
}

Score: success=12, repetition=0, complexity=4, rarity=15 → total=31 (borderline)
Filter: IGNORE (classified as temporary by keyword+length rule)
Stored: false
```

### Retrieved later:
```
Query: { context: "auth service deployment redis", type: "long", limit: 5 }
Retrieves: op-991 with similarity score ~0.74 — ranked #1
```

---

## Import Rules

```
orchestrator  →  agents    ✔
agents        →  utils     ✔
utils         →  nothing   ✔
agent         →  agent     ✗  (never)
utils         →  agents    ✗  (never)
```

---

## Auto-Clean System

The cleaner runs automatically every 50 `processMemory` calls, or manually via `runCleanCycle()`.

- **Short-term**: removed after 30-minute TTL regardless of score.
- **Long-term**: score decayed by 2% per 24h interval × decay factor. Items with score < 10 removed.
- **Patterns**: score decayed by 0.5% per 24h interval. Frequently accessed patterns have compressed decay.
- Decay factor is reduced for frequently accessed items — popular memories resist decay.
