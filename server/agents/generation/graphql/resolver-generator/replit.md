# GraphQL Resolver Generator (HVP)

## 1) Resolver generation flow

1. `orchestrator.ts` receives `ResolverConfig` with schema + optional handler/permission/loader maps.
2. Query, mutation, subscription, and field resolver agents generate resolver skeletons from schema input.
3. Auth guards are applied to enforce resolver-level permissions.
4. Dataloaders are applied to inject lazy loader instances into resolver context.
5. Error handler wraps every resolver to normalize runtime failures.
6. Final output is returned with `{ success, resolvers, logs, error? }` and frozen with `Object.freeze`.

Flow:
`orchestrator -> query-resolver -> mutation-resolver -> subscription-resolver -> auth-guard -> dataloader -> error-handler -> output`

## 2) File responsibilities

- `types.ts` (L0): shared contracts (`ResolverConfig`, resolver types, context, output).
- `state.ts` (L0): immutable generator state and patching helpers.
- `orchestrator.ts` (L1): execution coordinator only; no business/domain logic.
- `agents/*` (L2): each file performs one concern (query, mutation, subscription, field mapping, auth, dataloader, error handling).
- `utils/*` (L3): pure helpers (schema parsing, template resolver construction, context shaping, output mapping, logging).
- `index.ts`: public API exports.

## 3) Import flow (strict)

- L1 (`orchestrator`) imports from L2/L3/L0.
- L2 (`agents`) import from L3/L0 only.
- L3 (`utils`) import from L0 when needed.
- No agent-to-agent imports.
- No upward imports.

## 4) Example resolver output

```ts
{
  success: true,
  resolvers: {
    Query: {
      me: [Function],
    },
    Mutation: {
      updateProfile: [Function],
    },
    Subscription: {
      profileChanged: {
        subscribe: [Function],
        resolve: [Function],
      },
    },
    User: {
      organization: [Function],
    },
  },
  logs: [
    '[graphql-resolver-generator][orchestrator] Resolver generation started',
  ],
}
```

## 5) Dataloader usage

- Configure `loaderFactories` in `ResolverConfig`.
- Each resolver execution checks `context.loaders`.
- Missing loaders are lazily instantiated from the corresponding factory.
- Result: shared request-scoped loader cache and reduced N+1 query pressure.
