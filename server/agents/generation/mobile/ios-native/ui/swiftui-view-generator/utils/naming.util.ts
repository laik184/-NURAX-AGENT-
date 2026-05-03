export function toPascalCase(raw: string): string {
  const clean = raw.trim().replace(/[^a-zA-Z0-9\s_-]/g, " ");
  const parts = clean.split(/[\s_-]+/).filter(Boolean);

  const value = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  return value.length > 0 ? value : "GeneratedView";
}

export function ensureViewName(screenName: string): string {
  const normalized = toPascalCase(screenName);
  return normalized.endsWith("View") ? normalized : `${normalized}View`;
}
