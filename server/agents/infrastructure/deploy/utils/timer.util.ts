export async function timeExecution<T>(task: () => Promise<T>): Promise<{ readonly value: T; readonly durationMs: number }> {
  const startedAt = Date.now();
  const value = await task();

  return Object.freeze({
    value,
    durationMs: Date.now() - startedAt,
  });
}
