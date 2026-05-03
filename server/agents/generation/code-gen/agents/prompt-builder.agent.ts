import type { CodeRequest, PlannedStructure, TemplateSelection } from "../types.js";

export class PromptBuilderAgent {
  build(request: CodeRequest, structure: PlannedStructure, template: TemplateSelection): string {
    const constraints = request.constraints?.length
      ? request.constraints.map((rule) => `- ${rule}`).join("\n")
      : "- No extra constraints provided.";

    return [
      "You are generating production TypeScript code.",
      "Return strict JSON with shape: { files: [{ path, content }] }.",
      "No markdown, no prose.",
      "",
      `Intent: ${request.intent}`,
      `Template: ${template.templateName}`,
      `Conventions:\n${template.conventions.map((item) => `- ${item}`).join("\n")}`,
      `Planned files:\n${structure.files.map((file) => `- ${file}`).join("\n")}`,
      `Constraints:\n${constraints}`,
      "",
      "Quality rules:",
      "- Clean layered architecture",
      "- No duplicate symbols",
      "- Keep each file focused on one responsibility",
      "- Compile-safe TypeScript",
    ].join("\n");
  }
}
