import type { FormSchema } from "../types.js";

export function buildApiIntegrationConfig(schema: FormSchema): Readonly<Record<string, unknown>> {
  return Object.freeze({
    endpoint: schema.submit.endpoint,
    method: schema.submit.method,
    headers: Object.freeze({
      "Content-Type": "application/json",
      ...(schema.submit.headers ?? {}),
    }),
  });
}

export function buildApiSubmissionAdapter(apiConfig: Readonly<Record<string, unknown>>): string {
  return `
  async function submitToApi(payload: Record<string, unknown>) {
    return apiClient.request({
      endpoint: ${JSON.stringify(apiConfig.endpoint)},
      method: ${JSON.stringify(apiConfig.method)},
      headers: ${JSON.stringify(apiConfig.headers)},
      body: payload,
    });
  }
  `.trim();
}
