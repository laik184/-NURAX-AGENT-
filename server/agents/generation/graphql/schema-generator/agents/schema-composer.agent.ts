export function composeSchema(parts: {
  readonly scalars: readonly string[];
  readonly interfaces: readonly string[];
  readonly directives: readonly string[];
  readonly types: readonly string[];
  readonly query: string;
  readonly mutation: string;
  readonly subscription: string;
}): string {
  const blocks = [
    ...parts.scalars,
    ...parts.interfaces,
    ...parts.directives,
    ...parts.types,
    parts.query,
    parts.mutation,
    parts.subscription,
  ].filter((block) => block.trim().length > 0);

  return `${blocks.join("\n\n")}\n`;
}
