const RESERVED = new Set(["Query", "Mutation", "Subscription", "Schema"]);

export function toTypeName(input: string): string {
  const cleaned = input.replace(/[^a-zA-Z0-9_]/g, " ").trim();
  const words = cleaned.length > 0 ? cleaned.split(/\s+/) : ["Unnamed"];
  const named = words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join("");
  if (RESERVED.has(named)) return `${named}Type`;
  return named || "Unnamed";
}

export function toFieldName(input: string): string {
  const typeName = toTypeName(input);
  return typeName[0]!.toLowerCase() + typeName.slice(1);
}
