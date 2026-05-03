import type {
  GraphQLType,
  MutationDefinition,
  QueryDefinition,
  SubscriptionDefinition,
} from "../types.js";
import { buildTypeDependencyGraph, hasCircularTypeReferences } from "./dependency-resolver.util.js";

function hasBalancedBraces(schema: string): boolean {
  let count = 0;
  for (const char of schema) {
    if (char === "{") count += 1;
    if (char === "}") count -= 1;
    if (count < 0) return false;
  }
  return count === 0;
}

function uniqueByName<T extends { readonly name: string }>(items: readonly T[]): boolean {
  return new Set(items.map((item) => item.name)).size === items.length;
}

function allRequiredFieldsPresent(types: readonly GraphQLType[]): boolean {
  return types.every((typeDef) =>
    typeDef.fields.length > 0 &&
    typeDef.fields.every((field) => field.name.length > 0 && field.type.length > 0),
  );
}

export function validateSchemaParts(input: {
  readonly types: readonly GraphQLType[];
  readonly queries: readonly QueryDefinition[];
  readonly mutations: readonly MutationDefinition[];
  readonly subscriptions: readonly SubscriptionDefinition[];
  readonly schema: string;
}): { readonly valid: boolean; readonly errors: readonly string[] } {
  const errors: string[] = [];

  if (!uniqueByName(input.types)) {
    errors.push("Duplicate GraphQL type names are not allowed.");
  }

  const graph = buildTypeDependencyGraph(input.types);
  if (hasCircularTypeReferences(graph)) {
    errors.push("Circular type references detected in schema types.");
  }

  if (!allRequiredFieldsPresent(input.types)) {
    errors.push("Each type must define at least one field with valid name and type.");
  }

  if (!hasBalancedBraces(input.schema) || !input.schema.includes("type Query")) {
    errors.push("Generated schema failed GraphQL syntax checks.");
  }

  if (!uniqueByName(input.queries)) {
    errors.push("Duplicate query operation names are not allowed.");
  }

  if (!uniqueByName(input.mutations)) {
    errors.push("Duplicate mutation operation names are not allowed.");
  }

  if (!uniqueByName(input.subscriptions)) {
    errors.push("Duplicate subscription operation names are not allowed.");
  }

  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}
