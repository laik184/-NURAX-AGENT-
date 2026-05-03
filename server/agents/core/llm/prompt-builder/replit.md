# Prompt Builder Module

## 1) Prompt building flow

The orchestrator executes a strict, single-pass pipeline:

1. Load system prompt (`system-prompt.agent.ts`)
2. Process user input (`user-prompt.agent.ts`)
3. Attach context (`context-builder.agent.ts`)
4. Enforce instructions (`instruction-enforcer.agent.ts`)
5. Optimize tokens (`token-optimizer.agent.ts`)
6. Format final prompt (`prompt-formatter.agent.ts`)
7. Return frozen output object

Flow example:

`orchestrator -> context-builder -> token-optimizer -> prompt-formatter`

## 2) File responsibilities

- `orchestrator.ts` (L1): coordinates all agents and state transitions
- `agents/*.agent.ts` (L2): one focused responsibility per file
- `utils/*.util.ts` (L3): pure helper functions only
- `types.ts`, `state.ts` (L0): contracts and runtime state
- `index.ts`: public exports for consumers

## 3) Import relationships

HVP import direction is strictly downward:

- L1 can import L2/L3/L0
- L2 can import L3/L0
- L3 imports nothing domain-specific
- Agent-to-agent imports are forbidden

## 4) Token optimization logic

`token-optimizer.agent.ts` prevents overflow by:

- estimating fixed token usage (system + user)
- computing available budget for context
- selecting high-priority context first
- truncating the last fitting context entry when needed
- returning `TokenStats` (`estimatedTokens`, `remaining`, `truncated`)

## 5) Example prompt output

```text
<SYSTEM>
You are a helpful AI assistant. Follow response format, preserve clarity, and avoid unsupported claims.
</SYSTEM>

<CONTEXT>
(1) [priority=100] Previous assistant answer summary...
(2) [priority=90] Relevant business rule...
</CONTEXT>

<USER>
User request:
Summarize the deployment plan.
</USER>
```
