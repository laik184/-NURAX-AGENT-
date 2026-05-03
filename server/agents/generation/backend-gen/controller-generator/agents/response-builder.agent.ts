import type { MethodDefinition } from "../types.js";

export function buildMethodResponse(method: MethodDefinition): string {
  const responseCode = method.route.successStatusCode ?? (method.route.method === "POST" ? 201 : 200);

  return [
    `${method.requestExtractCode}`,
    "const servicePayload = {",
    "  params: req.params,",
    "  query: req.query,",
    "  body: req.body,",
    "};",
    `const result = await this.service.${method.serviceMethod}(servicePayload);`,
    `return res.status(${responseCode}).json({ success: true, data: result });`,
  ].join("\n");
}
