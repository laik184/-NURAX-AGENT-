# GraphQL Schema Generator (HVP-Compliant)

## 1) Schema generation flow

The orchestrator drives the complete flow and does not contain business logic:

1. Load input `SchemaConfig`
2. Generate GraphQL types (`type-generator`)
3. Generate queries (`query-generator`)
4. Generate mutations (`mutation-generator`)
5. Generate subscriptions (`subscription-generator`)
6. Generate scalars, interfaces, directives
7. Compose final SDL (`schema-composer`)
8. Validate schema consistency and syntax
9. Return frozen output object

Flow sequence:

`orchestrator -> type-generator -> query-generator -> mutation-generator -> subscription-generator -> schema-composer`

## 2) File responsibilities

- `orchestrator.ts` (L1): Coordinates pipeline and state transitions.
- `agents/*.agent.ts` (L2): Each file performs one generation responsibility only.
- `utils/*.util.ts` (L3): Naming, SDL formatting, validation, dependency checks, logging.
- `types.ts` (L0): Contracts for schema entities and output.
- `state.ts` (L0): Internal generator status and artifacts.
- `index.ts`: Public API exports.

## 3) Import relationships

HVP layering is enforced:

- L1 -> L2, L3, L0 allowed.
- L2 -> L3, L0 allowed.
- L3 -> L0 allowed.
- Agent-to-agent imports are forbidden.
- Upward imports are forbidden.

## 4) Example schema output

```graphql
scalar DateTime

"""Authorization gate"""
directive @auth(role: String!) on FIELD_DEFINITION

interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  email: String!
  createdAt: DateTime!
}

type Query {
  user(id: ID!): User
}

type Mutation {
  createUser(email: String!): User!
}

type Subscription {
  userCreated: User!
}
```
