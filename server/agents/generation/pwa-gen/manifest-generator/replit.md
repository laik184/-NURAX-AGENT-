# manifest-generator (HVP architecture)

## Layering
- `orchestrator.ts` is the only entrypoint that coordinates flow.
- `agents/` contain isolated generation responsibilities.
- `utils/` contain pure deterministic helper functions.
- `types.ts` and `state.ts` define the L0 contract and immutable state shape.

## Call graph
`orchestrator.ts`
→ `manifest-builder.agent.ts`
→ `icon-config.agent.ts`
→ `shortcut-generator.agent.ts`
→ `screenshot-config.agent.ts`

## Rules followed
- No cross-agent imports.
- Orchestrator alone calls agents.
- Output is deeply immutable via `deep-freeze.util.ts` + `Object.freeze`.
- Deterministic behavior with no runtime randomness.
