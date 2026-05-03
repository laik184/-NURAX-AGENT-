import type { BindingConfig } from "../types.js";

function resolveDefaultValue(binding: Readonly<BindingConfig>): string {
  if (binding.propertyWrapper === "Binding") {
    return "";
  }

  if (!binding.defaultValue) {
    return "";
  }

  return ` = ${binding.defaultValue}`;
}

export function buildBindingDeclarations(bindings: readonly BindingConfig[]): string {
  return bindings
    .map((binding) => `@${binding.propertyWrapper} var ${binding.name}: ${binding.swiftType}${resolveDefaultValue(binding)}`)
    .join("\n");
}
