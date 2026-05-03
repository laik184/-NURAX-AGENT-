# offline-strategy module

## Module Purpose
Offline strategy engine for PWA performance + resilience.

## Flow
`orchestrator`
→ `strategy-selector.agent`
→ (`network-first` | `cache-first` | `stale-while-revalidate`)
→ `offline-page.agent` (fallback)

## Import Rules
- orchestrator → agents + utils
- agents → utils only
- utils → no imports
