import type { Endpoint, GeneratedRoute, HttpMethod } from "../types";
import { createRouteName } from "../utils/naming.util";
import { normalizeRoutePath } from "../utils/path-builder.util";

export const buildRoutes = (endpoints: Endpoint[], methods: HttpMethod[]): GeneratedRoute[] =>
  endpoints.map((endpoint, index) => {
    const normalizedPath = normalizeRoutePath(endpoint.path);

    return {
      endpoint,
      method: methods[index],
      normalizedPath,
      routeName: createRouteName(methods[index], normalizedPath),
      frameworkCode: "",
    };
  });
