import type { SchemaMeta } from "../types.js";

export function normalizeSchemaMeta(schema: SchemaMeta): SchemaMeta {
  const sortedFields = [...schema.fields].sort((left, right) => left.name.localeCompare(right.name));
  return Object.freeze({
    ...schema,
    fields: Object.freeze(sortedFields),
  });
}

export function dedupeSchemas(schemas: readonly SchemaMeta[]): readonly SchemaMeta[] {
  const seen = new Set<string>();
  const unique: SchemaMeta[] = [];

  for (const schema of schemas) {
    if (seen.has(schema.name)) {
      continue;
    }

    seen.add(schema.name);
    unique.push(normalizeSchemaMeta(schema));
  }

  return Object.freeze(unique);
}
