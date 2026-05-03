# Router Utils Layer (L3)

## Purpose
Pure helper utilities shared by agents and orchestrator.

## Files
- `model-registry.util.ts`: provider/model metadata.
- `scoring-engine.util.ts`: normalization + weighted score helpers.
- `token-estimator.util.ts`: token estimation helpers.
- `logger.util.ts`: structured log helpers.
- `config-loader.util.ts`: provider filtering helpers.

## Call graph
`orchestrator/agents -> utils`

## Import rule
Utils do not import agent code.
