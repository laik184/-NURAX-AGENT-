import type { FormConfig, FormFieldConfig } from "../types.js";
import { indentLines } from "../utils/swift-syntax.util.js";

function generateField(field: Readonly<FormFieldConfig>): string {
  if (field.type === "toggle") {
    return `Toggle("${field.label}", isOn: .constant(false))`;
  }

  if (field.type === "secure") {
    return `SecureField("${field.placeholder ?? field.label}", text: .constant(""))`;
  }

  return `TextField("${field.placeholder ?? field.label}", text: .constant(""))`;
}

export function generateFormSection(config?: Readonly<FormConfig>): string {
  if (!config?.enabled || config.fields.length === 0) {
    return "";
  }

  const fieldLines = config.fields.flatMap((field) => {
    const lines = [generateField(field)];
    if (field.required) {
      lines.push(`Text("${field.label} is required").font(.caption).foregroundStyle(.red)`);
    }
    return lines;
  });

  return ["Form {", indentLines(fieldLines.join("\n")), "}"].join("\n");
}
