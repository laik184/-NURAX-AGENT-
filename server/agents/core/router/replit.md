# Task Routing Engine — server/agents/core/router/

## Purpose

This is the entry point of the entire agent system. Every incoming task passes through this router, which determines with high speed and confidence which domain, module, and agent should handle it. If this fails, the system fails. It is designed for deterministic, O(1)-class performance using pre-compiled keyword maps and regex patterns.

---

## Execution Flow

```
RouterInput
    │
    ▼
[1] intent-detector.agent       → DetectedIntent  (what does the user want?)
    │
    ▼
[2] domain-mapper.agent         → DomainMapping   (which domain + module?)
    │
    ▼
[3] agent-selector.agent        → AgentSelection  (which exact agent?)
    │
    ▼
[4] confidence-scorer.agent     → ConfidenceScore (how sure are we?)
    │
    ▼
[5] fallback-router.agent       (if confidence < 0.30)
    │
    ▼
RouterResult + state.recordRoute()
```

---

## File Responsibilities

### L0 — Foundation

| File | Responsibility |
|------|----------------|
| `types.ts` | All shared type contracts. No logic. |
| `state.ts` | Routing history (`lastRoutes`, `failedRoutes`) and live metrics (`totalRequests`, `successRate`, `avgConfidence`). Pure functional updates with `Object.freeze()`. |

### L1 — Orchestrator

| File | Responsibility |
|------|----------------|
| `orchestrator.ts` | Coordinates all 5 routing steps in sequence. Triggers fallback when confidence is too low. Records every route to state. No business logic. |

### L2 — Agents (Single Responsibility, No Cross-Imports)

| File | Responsibility |
|------|----------------|
| `agents/intent-detector.agent.ts` | Combines regex pattern matching and keyword matching to determine the primary user intent (generate, fix, deploy, etc.) with a confidence value. |
| `agents/domain-mapper.agent.ts` | Maps detected intent + raw input to a specific domain and module using pattern and keyword lookups. Falls back to intent-to-domain lookup table if no direct signal. |
| `agents/agent-selector.agent.ts` | Resolves the exact agent name within the chosen module using sub-keyword matching. Falls back to the module's default agent. |
| `agents/confidence-scorer.agent.ts` | Combines keyword match count, pattern weight, context presence, intent confidence, and domain validity into a 0–1 confidence score. |
| `agents/fallback-router.agent.ts` | When confidence is too low or an exception occurs, performs loose keyword scanning across all domains and returns the safest possible route. |

### L3 — Pure Utilities (No State Access)

| File | Responsibility |
|------|----------------|
| `utils/keyword-matcher.util.ts` | Normalizes input, extracts tokens, and scores against keyword maps with substring fallback matching. |
| `utils/pattern-matcher.util.ts` | Pre-compiled `RegExp` rules for intent and domain detection. Returns sorted scored matches. |
| `utils/scoring.util.ts` | Pure confidence math: weights keyword matches, pattern weight, context bonus, and intent/domain validity. |

---

## Which File Calls Which

```
orchestrator
  → intent-detector.agent    (uses: pattern-matcher.util, keyword-matcher.util)
  → domain-mapper.agent      (uses: pattern-matcher.util, keyword-matcher.util)
  → agent-selector.agent     (uses: keyword-matcher.util)
  → confidence-scorer.agent  (uses: scoring.util)
  → fallback-router.agent    (uses: keyword-matcher.util)
  → state                    (recordRoute)

NO agent imports another agent.
Utils import nothing.
```

---

## Data Flow Diagram

```
"generate REST API for user auth"
         │
         ▼
  intent-detector
  ─ pattern hit: /generate/  → "generate"
  ─ keyword hit: "generate"  → score=12
  ─ DetectedIntent { intent: "generate", confidence: 0.85 }
         │
         ▼
  domain-mapper
  ─ pattern hit: /api|rest|endpoint/ → "backend-gen"
  ─ keyword hit: "auth"              → "backend-gen" (auth agent)
  ─ DomainMapping { domain: "generation", module: "backend-gen" }
         │
         ▼
  agent-selector
  ─ sub-keyword "auth" matches backend-gen sub-map
  ─ AgentSelection { agent: "auth-generator" }
         │
         ▼
  confidence-scorer
  ─ keywords=5, pattern=10, context=false, intentKnown=true
  ─ confidence = 0.78
         │
         ▼
  0.78 ≥ 0.30 → NO fallback
         │
         ▼
  RouterResult {
    success: true,
    domain: "generation",
    module: "backend-gen",
    agent: "auth-generator",
    confidence: 0.78,
    logs: [...]
  }
```

---

## Example Input → Output

### Example 1 — Generate REST API

**Input:**
```json
{ "input": "generate REST API" }
```

**Output:**
```json
{
  "success": true,
  "domain": "generation",
  "module": "backend-gen",
  "agent": "api-generator",
  "confidence": 0.72,
  "logs": [...]
}
```

---

### Example 2 — Fix a Bug

**Input:**
```json
{ "input": "fix the authentication bug in the login route" }
```

**Output:**
```json
{
  "success": true,
  "domain": "core",
  "module": "execution",
  "agent": "code-fixer",
  "confidence": 0.68,
  "logs": [...]
}
```

---

### Example 3 — Deploy with Docker

**Input:**
```json
{ "input": "deploy the app using Docker" }
```

**Output:**
```json
{
  "success": true,
  "domain": "infrastructure",
  "module": "deploy",
  "agent": "docker-configurator",
  "confidence": 0.81,
  "logs": [...]
}
```

---

### Example 4 — Low Confidence / Fallback

**Input:**
```json
{ "input": "do the thing" }
```

**Output:**
```json
{
  "success": true,
  "domain": "intelligence",
  "module": "decision-engine",
  "agent": "decision-agent",
  "confidence": 0.1,
  "logs": ["[fallback] No confident route found — defaulting to decision-engine."]
}
```

---

## Performance Design

- All keyword maps are plain `Record<string, string[]>` — O(k) lookup where k is the number of keys (constant).
- All regex patterns are pre-compiled at module load time via `Object.freeze([...])`.
- No deep nested loops — pattern matching iterates over a fixed-length pattern array.
- No async operations — the entire routing pipeline is synchronous.
- Typical routing time: < 2ms for inputs under 500 characters.

---

## Import Rules

```
orchestrator  →  agents    ✔
orchestrator  →  utils     ✔  (only for orchestrator-level calls)
agents        →  utils     ✔
utils         →  nothing   ✔
agent         →  agent     ✗  (never)
utils         →  agents    ✗  (never)
utils         →  state     ✗  (never)
```

---

## State Tracked

| Field | Description |
|-------|-------------|
| `lastRoutes` | Rolling window of last 100 route records |
| `failedRoutes` | Last 50 failed or low-confidence routes |
| `metrics.totalRequests` | Cumulative request count |
| `metrics.successRate` | % of last-100 routes that succeeded |
| `metrics.avgConfidence` | Average confidence of last-100 routes |
