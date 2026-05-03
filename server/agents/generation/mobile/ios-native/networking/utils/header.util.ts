export function toSwiftHeaderDictionary(headers: Readonly<Record<string, string>>): string {
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return "[:]";
  }

  const mapped = entries.map(([key, value]) => `\"${key}\": \"${value}\"`).join(", ");
  return `[${mapped}]`;
}
