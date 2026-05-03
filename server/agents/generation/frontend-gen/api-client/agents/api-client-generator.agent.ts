import type { ClientConfig, RequestTemplate } from "../types.js";
import { buildFetchTemplate, buildAxiosTemplate } from "../utils/template-builder.util.js";
import { createClientImport, createClientInstance } from "../utils/http-client.util.js";

export function generateApiClientFile(
  templates: readonly RequestTemplate[],
  config: ClientConfig,
  helpers: readonly string[],
): string {
  const importBlock = createClientImport(config.client);
  const instanceBlock = createClientInstance(config.client, config.baseUrlVariable);
  const templateBuilder = config.client === "axios" ? buildAxiosTemplate : buildFetchTemplate;

  const endpointFunctions = templates.map((template) => templateBuilder(template)).join("\n\n");

  return [
    importBlock,
    instanceBlock,
    ...helpers,
    endpointFunctions,
  ].filter(Boolean).join("\n\n");
}
