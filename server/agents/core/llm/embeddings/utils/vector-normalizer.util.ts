export function normalizeVector(values: readonly number[]): readonly number[] {
  if (values.length === 0) {
    return Object.freeze([]);
  }

  let sumSquares = 0;
  for (const value of values) {
    sumSquares += value * value;
  }

  if (sumSquares === 0) {
    return Object.freeze([...values]);
  }

  const norm = Math.sqrt(sumSquares);
  return Object.freeze(values.map((value) => value / norm));
}
