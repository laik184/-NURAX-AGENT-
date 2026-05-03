import type { FormSchema } from "../types.js";
import { toSectionKey } from "../utils/field-mapper.util.js";

export function generateFormStructure(schema: FormSchema): string {
  const sections = new Set(schema.fields.map((field) => toSectionKey(field)));
  const sectionMarkup = [...sections]
    .map((section) => `<section data-section="${section}"></section>`)
    .join("\n      ");

  return `<div className="form-layout">\n      ${sectionMarkup}\n      </div>`;
}
