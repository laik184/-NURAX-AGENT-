export function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

export function toSwiftURLBuilder(pathExpression: string): string {
  return `URL(string: baseURL + ${pathExpression})`;
}
