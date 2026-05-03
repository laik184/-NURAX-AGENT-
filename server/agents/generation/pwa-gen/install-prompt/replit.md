# Install Prompt Module (HVP)

## 1. Module Overview
This module implements a conversion-focused PWA install prompt pipeline using HVP layering.
- **L1 Orchestrator** coordinates agent execution and state transitions only.
- **L2 Agents** each own one business capability.
- **L3 Utils** provide reusable pure helpers.
- All results and state snapshots are immutable via `Object.freeze`.

## 2. File Responsibilities
- `types.ts` (L0): shared immutable contracts (`InstallPromptState`, `InstallResult`, environment contracts).
- `state.ts` (L0): immutable state factory + transition reducers.
- `orchestrator.ts` (L1): deterministic call sequencing and controlled state updates.
- `agents/prompt-event.agent.ts`: capture + defer `beforeinstallprompt` event payload.
- `agents/install-button.agent.ts`: install CTA model and visibility decision (mobile vs desktop + iOS wording).
- `agents/install-trigger.agent.ts`: prompt triggering from intent signals + cooldown guard.
- `agents/install-tracker.agent.ts`: accepted/dismissed tracking + conversion metric serialization.
- `agents/ux-optimizer.agent.ts`: timing optimization and prompt-eligibility strategy.
- `utils/event.util.ts`: prompt event normalization.
- `utils/device-detect.util.ts`: deterministic device classification.
- `utils/throttle.util.ts`: spam prevention throttling.
- `utils/storage.util.ts`: immutable storage read/write wrapper.
- `index.ts`: public module exports.

## 3. Call Flow Diagram
```txt
orchestrator
  ↓
agents
  ↓
utils
```

Detailed sequence:
1. detect device
2. capture install event
3. decide UX timing
4. render install button
5. trigger install
6. track result

## 4. Import Rules
- `orchestrator -> agents` only for business capabilities.
- `agents -> utils` only.
- `utils -> nothing`.
- No agent-to-agent imports.
- No upward imports.

## 5. UX Strategy Notes
- Returning users are prioritized for prompting.
- Android users can receive earlier prompt eligibility due to native install intent patterns.
- iOS CTA defaults to **Add to Home** for platform clarity.
- Prompt trigger requires intent signal (click, scroll depth, or exit intent).

## 6. Conversion Optimization Logic
- Cooldown windows scale with dismiss count (anti-spam).
- Prompting requires both UX-eligibility and trigger intent.
- Outcome tracking computes rolling conversion rate.
- Serialized metrics are written immutably for future orchestration cycles.
