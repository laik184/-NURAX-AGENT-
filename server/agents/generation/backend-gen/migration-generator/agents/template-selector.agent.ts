import type { TemplateKind, TemplateSelection } from "../types.js";

export function selectTemplate(preference: TemplateKind = "sql"): TemplateSelection {
  if (preference === "orm") {
    return Object.freeze({
      template: "orm",
      extension: "ts",
      headerComment: "// ORM Migration Template",
    });
  }

  return Object.freeze({
    template: "sql",
    extension: "sql",
    headerComment: "-- SQL Migration Template",
  });
}
