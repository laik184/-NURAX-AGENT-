const VALID_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidFileName(path: string): boolean {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }

  return segments.every((segment) => {
    const [name] = segment.split(".");
    return Boolean(name) && VALID_SEGMENT.test(name);
  });
}

export function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\+/g, "/")
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}
