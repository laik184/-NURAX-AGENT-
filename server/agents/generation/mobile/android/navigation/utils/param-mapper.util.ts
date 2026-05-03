export function mapRouteParams(
  pathTemplate: string,
  params: Readonly<Record<string, string | number | boolean>> = {},
): string {
  const replaced = pathTemplate.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    if (!(key in params)) {
      throw new Error(`Missing required route parameter: ${key}`);
    }

    return encodeURIComponent(String(params[key]));
  });

  return replaced;
}
