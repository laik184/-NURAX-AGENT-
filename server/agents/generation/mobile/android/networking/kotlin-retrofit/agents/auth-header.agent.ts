export function injectAuthHeader(
  headers: Readonly<Record<string, string>>,
  token?: string,
): Readonly<Record<string, string>> {
  if (!token) {
    return Object.freeze({ ...headers });
  }

  return Object.freeze({
    ...headers,
    Authorization: `Bearer ${token}`,
  });
}
