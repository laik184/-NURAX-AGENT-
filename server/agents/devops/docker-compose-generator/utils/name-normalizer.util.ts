export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeNetworkName(name: string): string {
  return normalizeName(name) + "-network";
}

export function normalizeVolumeName(name: string): string {
  return normalizeName(name) + "-data";
}

export function normalizeServiceName(name: string): string {
  return normalizeName(name);
}

export function toEnvVarName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}
