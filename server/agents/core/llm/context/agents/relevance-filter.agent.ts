const NOISE_PATTERNS: readonly RegExp[] = Object.freeze([
  /^\s*\[[^\]]*log[^\]]*\].*$/gim,
  /^\s*(debug|trace|verbose)\s*[:=-].*$/gim,
  /^\s*console\.(log|debug|trace)\(.*$/gim,
]);

export function filterRelevantContext(rawContext: string): string {
  const withoutNoise = NOISE_PATTERNS.reduce(
    (accumulator, pattern) => accumulator.replace(pattern, ""),
    rawContext,
  );

  return withoutNoise
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .join("\n");
}
