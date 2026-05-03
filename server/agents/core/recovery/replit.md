# Recovery Engine — server/agents/core/recovery/

## Purpose

This module is the fault-tolerance backbone of the system. Any agent — generation, execution, intelligence — can hand off a failure to this engine and receive a structured recovery result. It detects whether a real error exists, classifies it, selects a retry strategy, builds a fix plan, applies the safest action, and verifies safety before execution.

Without this: failures propagate and crash the system.  
With this: the system self-heals and degrades gracefully.

---

## Call Flow

```
recover(RecoveryInput)
        │
        ├── [1] error-detector.agent      → DetectedError
        │       uses: error-parser.util
        │
        ├── [2] failure-classifier.agent  → FailureClassification
        │       (pattern matching on error message + stack)
        │
        ├── [3] retry-strategy.agent      → RetryStrategy
        │       uses: retry-policy.util
        │
        ├── [4] recovery-planner.agent    → RecoveryPlan
        │       (action catalog lookup by failure type)
        │
        ├── [N attempts loop]
        │    ├── [5] fix-applier.agent    → FixResult
        │    │       (selects best safe action, simulates)
        │    │
        │    └── [6] safety-guard.agent   → SafetyCheckResult
        │            (blocks destructive/unsafe actions)
        │
        ├── state.recordAttempt + state.setStatus
        └── RecoveryResult (frozen)
```

---

## File Responsibilities

### L0 — Foundation

| File | Responsibility |
|------|----------------|
| `types.ts` | All type contracts: `RecoveryInput`, `RecoveryResult`, `FailureType`, `RetryStrategy`, `RecoveryPlan`, `DetectedError`, `FailureClassification`, `FixResult`, `SafetyCheckResult`, `RecoveryState`, `RetryRecord`. |
| `state.ts` | Tracks `attempts`, `lastError`, rolling `retryHistory` (capped at 100), `status`. All writes produce new frozen snapshots. Exposes `getTotalAttempts()`, `getSuccessfulRecoveries()`. Resets per session via `resetForSession()`. |

### L1 — Orchestrator

| File | Responsibility |
|------|----------------|
| `orchestrator.ts` | Sequences all 6 agents, manages the retry loop, handles early exit conditions (no error, non-recoverable, no-retry policy, safety block), records each attempt to state. No business logic. |

### L2 — Agents (Single Responsibility, No Cross-Imports)

| File | Responsibility |
|------|----------------|
| `agents/error-detector.agent.ts` | Determines if a real error is present. Returns `hasError: false` for null/success/empty inputs. Parses the error into a `DetectedError`. |
| `agents/failure-classifier.agent.ts` | Applies 9 ordered pattern-matching rules against the error message and stack to classify into `FailureType` with confidence. Falls back to `"unknown"` with 0.5 confidence. |
| `agents/retry-strategy.agent.ts` | Selects retry kind (exponential/linear/immediate/no-retry), max attempts, and delay bounds from the policy table — capped by `input.maxAttempts`. |
| `agents/recovery-planner.agent.ts` | Looks up an action catalog keyed by failure type, filters to safe-only actions, computes estimated success rate. Returns empty plan for no-retry strategies. |
| `agents/fix-applier.agent.ts` | Selects the highest-confidence safe action, simulates execution (deterministic simulation — no I/O), falls back to secondary action on simulated failure. |
| `agents/safety-guard.agent.ts` | Blocks actions in the destructive action blocklist, checks for irreversible keywords in descriptions, enforces the `safe` flag on actions. Allows override via `input.allowDestructive`. |

### L3 — Pure Utilities (No Imports, No State)

| File | Responsibility |
|------|----------------|
| `utils/deep-freeze.util.ts` | Recursive `Object.freeze()`. |
| `utils/error-parser.util.ts` | Parses `string | Error` into a structured `ParsedError` with type, stack frames, error code, and origin file/line. |
| `utils/backoff.util.ts` | `exponentialDelay()`, `linearDelay()`, `immediateDelay()`, `getDelay()` — pure delay math with jitter. `formatDelay()` for human-readable output. |
| `utils/retry-policy.util.ts` | Policy lookup table: maps each `FailureType` to a `PolicyRule` (strategy kind, max attempts, base/max delays). `isRetryable()`, `exceedsMaxAttempts()`. |

---

## Import Rules

```
orchestrator  →  agents      ✔
orchestrator  →  utils       ✔
orchestrator  →  state       ✔
agents        →  utils       ✔
agents        →  types       ✔
utils         →  types       ✔  (retry-policy.util)
utils         →  nothing else ✔
agent         →  agent       ✗  (never)
utils         →  state       ✗  (never)
utils         →  agents      ✗  (never)
```

---

## Retry Policy Table

| Failure Type | Strategy | Max Attempts | Base Delay | Max Delay |
|-------------|----------|-------------|------------|-----------|
| timeout | exponential | 4 | 1,000ms | 30,000ms |
| network | exponential | 5 | 500ms | 20,000ms |
| runtime | linear | 3 | 800ms | 5,000ms |
| execution | linear | 3 | 500ms | 5,000ms |
| validation | immediate | 2 | 0ms | 0ms |
| dependency | linear | 2 | 2,000ms | 10,000ms |
| memory | no-retry | 0 | — | — |
| permission | no-retry | 0 | — | — |
| syntax | no-retry | 0 | — | — |
| unknown | linear | 2 | 1,000ms | 8,000ms |

---

## Output Contract

```json
{
  "success": true,
  "recovered": true,
  "strategy": "exponential",
  "attempts": 2,
  "logs": [
    "[recovery] Starting recovery — agent=\"backend-gen\"",
    "[recovery] Error detected: true — \"ETIMEDOUT: request timed out\"",
    "[recovery] Classified: type=\"timeout\", recoverable=true, confidence=0.92",
    "[recovery] Strategy: exponential — Using exponential strategy...",
    "[recovery] Plan: 2 action(s), estimated success rate=0.65",
    "[recovery] Attempt 1/4 — delay=500ms",
    "[recovery] Fix applied=true — Applied recovery action: \"retry-with-backoff\"",
    "[recovery] Safety check: safe=true — Action passed all safety checks.",
    "[recovery] Recovery succeeded on attempt 1.",
    "[recovery] Complete — recovered in 3ms after 1 attempt(s)."
  ]
}
```

---

## Example Input → Output

### Network timeout

**Input:**
```json
{
  "error": "ETIMEDOUT: connect timed out",
  "agentId": "deploy-orchestrator",
  "maxAttempts": 3
}
```

**Output:**
```json
{
  "success": true,
  "recovered": true,
  "strategy": "exponential",
  "attempts": 1,
  "logs": ["..."]
}
```

---

### Non-recoverable syntax error

**Input:**
```json
{
  "error": "SyntaxError: Unexpected token '<'",
  "agentId": "frontend-gen"
}
```

**Output:**
```json
{
  "success": false,
  "recovered": false,
  "strategy": "no-retry",
  "attempts": 0,
  "logs": ["[recovery] Failure type \"syntax\" is non-recoverable — aborting."],
  "error": "SyntaxError: Unexpected token '<'"
}
```

---

### Safety-blocked destructive action

**Input:**
```json
{
  "error": "execution failed — process killed",
  "allowDestructive": false
}
```

**Output:**
```json
{
  "success": true,
  "recovered": true,
  "strategy": "linear",
  "attempts": 1,
  "logs": ["...", "[recovery] Safety check: safe=true — Action passed all safety checks."]
}
```
