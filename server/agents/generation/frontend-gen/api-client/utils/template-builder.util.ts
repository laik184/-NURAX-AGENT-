import type { RequestTemplate } from "../types.js";

function buildPathInterpolation(pathTemplate: string): string {
  return pathTemplate.replace(/\{([a-zA-Z0-9_]+)\}/g, "${params.$1}");
}

export function buildFetchTemplate(template: RequestTemplate): string {
  const pathValue = buildPathInterpolation(template.pathTemplate);
  const bodyArg = template.hasBody ? ", body?: unknown" : "";
  const queryArg = template.queryParams.length ? ", query?: Record<string, string | number | boolean>" : "";

  return `export const ${template.functionName} = async (params: Record<string, string>${bodyArg}${queryArg}) => {
  const url = ` + "`" + `${pathValue}` + "`" + `;
  const response = await fetch(url, {
    method: "${template.method}",
    headers: ${JSON.stringify(template.headers, null, 2)}${template.hasBody ? ",\n    body: body ? JSON.stringify(body) : undefined" : ""}
  });

  return response;
};`;
}

export function buildAxiosTemplate(template: RequestTemplate): string {
  const pathValue = buildPathInterpolation(template.pathTemplate);
  const bodyArg = template.hasBody ? ", body?: unknown" : "";

  return `export const ${template.functionName} = async (params: Record<string, string>${bodyArg}) => {
  const response = await api.request({
    url: ` + "`" + `${pathValue}` + "`" + `,
    method: "${template.method}",
    headers: ${JSON.stringify(template.headers, null, 2)}${template.hasBody ? ",\n    data: body" : ""}
  });

  return response;
};`;
}
