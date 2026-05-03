function normalizeModifier(modifier: string): string {
  const trimmed = modifier.trim();
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

export function applyModifiers(baseComponent: string, modifiers: readonly string[]): string {
  if (modifiers.length === 0) {
    return baseComponent;
  }

  return modifiers.reduce((result, modifier) => `${result}\n${normalizeModifier(modifier)}`, baseComponent);
}
