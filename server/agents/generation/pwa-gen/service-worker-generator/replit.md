# Service Worker Generator

## Flow

`orchestrator.ts`
→ `cache-config.agent`
→ `precache-builder.agent`
→ `sw-lifecycle.agent`
→ `fetch-interceptor.agent`
→ `runtime-cache.agent`
→ `sw-registration.agent`

## Responsibility

- agents → logic
- utils → helpers
- orchestrator → coordination only

## Output

```ts
{
  success: boolean,
  logs: string[],
  error?: string
}
```
