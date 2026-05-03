# Agents Layer

## Purpose
Single-responsibility execution agents used only by `../orchestrator.ts`.

## Callers
- Primary caller: `../orchestrator.ts`.

## Import Diagram
```text
orchestrator.ts
  -> error-detector.agent.ts
  -> root-cause-analyzer.agent.ts
  -> fix-strategy.agent.ts
  -> patch-generator.agent.ts
  -> fix-applier.agent.ts
  -> validation.agent.ts
  -> fallback.agent.ts
```
