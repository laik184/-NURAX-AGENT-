import type { GraphQLType } from "../types.js";

const SCALARS = new Set(["ID", "String", "Int", "Float", "Boolean"]);

export function buildTypeDependencyGraph(types: readonly GraphQLType[]): ReadonlyMap<string, readonly string[]> {
  const names = new Set(types.map((typeDef) => typeDef.name));
  const graph = new Map<string, readonly string[]>();

  for (const typeDef of types) {
    const dependencies = typeDef.fields
      .map((field) => field.type.replace(/!/g, ""))
      .filter((typeName) => names.has(typeName) && !SCALARS.has(typeName) && typeName !== typeDef.name);

    graph.set(typeDef.name, Object.freeze([...new Set(dependencies)]));
  }

  return graph;
}

export function hasCircularTypeReferences(graph: ReadonlyMap<string, readonly string[]>): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);

    const neighbors = graph.get(node) ?? [];
    for (const next of neighbors) {
      if (dfs(next)) return true;
    }

    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const node of graph.keys()) {
    if (dfs(node)) return true;
  }

  return false;
}
