export interface Timer {
  elapsedMs(): number;
}

export function startTimer(startedAt = Date.now()): Timer {
  return {
    elapsedMs(): number {
      return Date.now() - startedAt;
    },
  };
}
