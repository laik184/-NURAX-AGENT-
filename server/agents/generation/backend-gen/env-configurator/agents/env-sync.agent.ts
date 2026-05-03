import type { EnvSchema } from '../types.js';

export const syncEnvValues = (
  existing: Record<string, string>,
  proposed: Record<string, string>,
  schema: EnvSchema,
): { synced: Record<string, string>; updated: boolean } => {
  const synced: Record<string, string> = { ...existing };
  let updated = false;

  for (const variable of schema.variables) {
    if (synced[variable.key] !== undefined) {
      continue;
    }

    const next = proposed[variable.key];
    if (next !== undefined) {
      synced[variable.key] = next;
      updated = true;
    }
  }

  return { synced, updated };
};
