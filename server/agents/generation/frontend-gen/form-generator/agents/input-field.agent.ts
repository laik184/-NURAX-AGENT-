import type { FieldConfig, FormSchema } from "../types.js";

function buildSelectOptions(field: FieldConfig): string {
  const options = field.options ?? [];
  return options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
}

export function generateInputFields(schema: FormSchema): string {
  return schema.fields
    .map((field) => {
      const common = `name="${field.name}" aria-label="${field.label}"`;

      if (field.type === "select") {
        return `<label>${field.label}<select ${common}>${buildSelectOptions(field)}</select></label>`;
      }

      if (field.type === "textarea") {
        return `<label>${field.label}<textarea ${common} placeholder="${field.placeholder ?? ""}" /></label>`;
      }

      if (field.type === "checkbox") {
        return `<label><input type="checkbox" ${common} />${field.label}</label>`;
      }

      return `<label>${field.label}<input type="${field.type}" ${common} placeholder="${field.placeholder ?? ""}" /></label>`;
    })
    .join("\n      ");
}
