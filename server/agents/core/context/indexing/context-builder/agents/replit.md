# Context Builder Agents

- `relevance-scorer.agent.ts`: query/file similarity scoring
- `context-selector.agent.ts`: top relevant file selection
- `dependency-expander.agent.ts`: related import expansion
- `context-pruner.agent.ts`: token-budget pruning
- `ranking-engine.agent.ts`: final ranking projection

Import rule: agents can import only `../types` and `../utils/*`.
