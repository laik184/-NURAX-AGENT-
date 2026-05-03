# LLM Provider Router (HVP)

## 1) Routing flow

`orchestrator -> capability-matcher -> cost-optimizer -> latency-evaluator -> llm-provider-router -> provider-selector -> fallback-handler`

The orchestrator coordinates each step and returns a frozen `RoutingDecision` object.

## 2) Scoring system

- **Capability score**: task compatibility + context window fitness.
- **Cost score**: normalized inverse token cost estimate.
- **Latency score**: normalized inverse estimated response time.
- **Weighted total**: blends capability, quality, cost, and latency.

## 3) Provider selection logic

- Ranked scores are sorted descending by weighted score.
- Top score becomes primary selection.
- Supports OpenAI (GPT-4/GPT-5), Anthropic (Claude), Gemini, and Ollama.

## 4) Fallback strategy

- If primary fails (or request marks provider as failed), fallback-handler picks next ranked provider.
- Fallback attempts are tracked in router state.

## 5) File responsibilities

- `orchestrator.ts`: workflow coordination + state updates only.
- `agents/*.agent.ts`: single-purpose decision/evaluation agents.
- `utils/*.util.ts`: pure helper utilities.
- `types.ts`: contracts.
- `state.ts`: immutable state container.
- `index.ts`: public exports.

## 6) Import relationships

- L1 (`orchestrator`) imports L2/L0/L3.
- L2 (`agents`) imports L3/L0 only.
- L3 (`utils`) imports L0 only where needed.
- L0 has no downward dependencies.
