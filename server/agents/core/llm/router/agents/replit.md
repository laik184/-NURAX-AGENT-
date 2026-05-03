# Router Agents Layer (L2)

## Purpose
Single-responsibility agents used by `../orchestrator.ts`.

## Files
- `llm-provider-router.agent.ts`: merges capability/cost/latency into provider scores.
- `provider-selector.agent.ts`: chooses top-ranked provider.
- `fallback-handler.agent.ts`: chooses alternative provider after failure.
- `capability-matcher.agent.ts`: scores task-model fit.
- `cost-optimizer.agent.ts`: estimates token spend and normalizes cost score.
- `latency-evaluator.agent.ts`: estimates latency and normalizes speed score.

## Call graph
`orchestrator.ts -> each agent`

## Import rule
Agents import only from `../types.ts` and `../utils/*`.
