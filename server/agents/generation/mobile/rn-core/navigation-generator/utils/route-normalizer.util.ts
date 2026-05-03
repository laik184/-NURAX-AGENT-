export function normalizeRoutes(inputScreens: readonly string[]): readonly string[] {
  const normalized = inputScreens
    .map((screen) => screen.trim())
    .filter((screen) => screen.length > 0)
    .map((screen) =>
      screen
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(""),
    );

  const unique = Array.from(new Set(normalized));
  return Object.freeze(unique);
}
