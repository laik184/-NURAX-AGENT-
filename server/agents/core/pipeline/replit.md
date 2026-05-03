# core/pipeline

## Purpose
The main execution pipeline that wires all system modules into a single end-to-end flow. This is the authoritative entry point for processing any user request through the full agent system.

## HVP Layer
- **L0:** `types.ts` (PipelineInput, PipelineOutput, PhaseResult, PipelineState, PipelineMetrics)
- **L0:** `state.ts` (phase tracking, run metrics, lifecycle management)
- **L1:** `orchestrator.ts` (9-phase pipeline: safety → routing → decision → planning → validation → generation → execution → recovery → feedback → memory)
- **L2:** `agents/` (safety-gate, phase-runner, result-collector)
- **L3:** `utils/` (phase-tracker.util, error-collector.util)

## Execution Phases

| Phase | Module Called | Purpose |
|-------|--------------|---------|
| safety-check | `agents/safety-gate.agent` | Input validation and security gate |
| routing | `core/router` | Intent detection and domain routing |
| decision | `intelligence/decision-engine` | Strategy selection and agent orchestration |
| planning | `intelligence/planning/PlannerBoss` | Task decomposition and execution plan |
| validation | `intelligence/validation-engine` | 7-validator quality gate |
| generation | domain-specific generation agents | Artifact generation |
| execution | `core/execution/*` | Code application and execution |
| recovery | `core/recovery` | Automatic retry on failure (conditional) |
| feedback | `intelligence/feedback-loop` | Output evaluation and improvement |
| memory | `core/memory` | Learning persistence |

## Entry Point
```typescript
import { executePipeline } from './index.ts';
const result = await executePipeline({ requestId, input, sessionId });
```
