import type { CodeRequest, TemplateSelection } from "../types.js";

export class TemplateSelectorAgent {
  select(request: CodeRequest): TemplateSelection {
    const templateName = request.frameworkHint ?? inferTemplate(request.intent);

    const conventions =
      templateName === "React"
        ? ["Functional components", "Hooks-first", "PascalCase components"]
        : ["Dependency-injected services", "Controller/service/repository", "camelCase symbols"];

    return Object.freeze({
      templateName,
      conventions: Object.freeze(conventions),
    });
  }
}

function inferTemplate(intent: string): "Express" | "React" | "Node" {
  const normalized = intent.toLowerCase();
  if (normalized.includes("ui") || normalized.includes("component") || normalized.includes("react")) {
    return "React";
  }

  if (normalized.includes("api") || normalized.includes("route") || normalized.includes("express")) {
    return "Express";
  }

  return "Node";
}
