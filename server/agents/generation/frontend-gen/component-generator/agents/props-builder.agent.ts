import type { ComponentRequest, PropsDefinition } from "../types.js";
import { makePropsInterfaceName, toCamelCase } from "../utils/naming.util.js";

export function buildPropsDefinition(request: Readonly<ComponentRequest>): PropsDefinition {
  const safeProps = (request.props ?? []).map((prop) => Object.freeze({
    name: toCamelCase(prop.name),
    type: prop.type || "string",
    required: Boolean(prop.required),
    description: prop.description ?? null,
    defaultValue: prop.defaultValue ?? null,
  }));

  const signature = safeProps.length === 0
    ? "{}"
    : `{ ${safeProps.map((prop) => prop.name).join(", ")} }`;

  return Object.freeze({
    interfaceName: makePropsInterfaceName(request.componentName || "GeneratedComponent"),
    framework: request.framework ?? "react",
    props: Object.freeze(safeProps),
    signature,
  });
}
