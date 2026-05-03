export function buildBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim();
  if (!trimmed) {
    throw new Error("Base URL is required.");
  }

  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.endsWith("/") ? withProtocol : `${withProtocol}/`;
}
