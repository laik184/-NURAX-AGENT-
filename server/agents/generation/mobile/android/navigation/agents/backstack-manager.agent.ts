export function pushRoute(history: readonly string[], routeId: string): readonly string[] {
  return Object.freeze([...history, routeId]);
}

export function replaceTopRoute(history: readonly string[], routeId: string): readonly string[] {
  if (!history.length) {
    return Object.freeze([routeId]);
  }

  const next = [...history];
  next[next.length - 1] = routeId;
  return Object.freeze(next);
}

export function popRoute(history: readonly string[]): readonly string[] {
  if (history.length <= 1) {
    return history;
  }

  return Object.freeze(history.slice(0, -1));
}
