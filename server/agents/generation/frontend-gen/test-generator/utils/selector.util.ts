import type { ComponentMeta } from "../types.js";

export function buildRootTestId(meta: ComponentMeta): string {
  return `${meta.name.toLowerCase()}-root`;
}

export function buildPageTestId(meta: ComponentMeta): string {
  return `${meta.name.toLowerCase()}-page`;
}

export function buildFormSelectors(): Readonly<Record<string, string>> {
  return Object.freeze({
    submitButtonRole: "button",
    submitButtonName: "/submit/i",
    inputRole: "textbox",
  });
}
