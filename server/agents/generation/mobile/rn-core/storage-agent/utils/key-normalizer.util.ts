export function normalizeStorageKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  const collapsed = trimmed.replace(/\s+/g, "_").toLowerCase();
  return collapsed.replace(/[^a-z0-9:_-]/g, "");
}

export function normalizeTableName(rawTable: string): string {
  const normalized = normalizeStorageKey(rawTable);
  return normalized.length > 0 ? normalized : "default_table";
}
