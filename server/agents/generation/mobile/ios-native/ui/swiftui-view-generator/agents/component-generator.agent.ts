import type { ComponentConfig } from "../types.js";

export function generateComponents(components: readonly ComponentConfig[]): readonly string[] {
  return Object.freeze(
    components.map((component) => {
      if (component.type === "text") {
        return `Text("${component.value ?? component.title ?? "Label"}")`;
      }

      if (component.type === "button") {
        const title = component.title ?? "Continue";
        return `Button("${title}") { /* ${component.actionName ?? "handleTap"} */ }`;
      }

      if (component.type === "textfield") {
        const placeholder = component.title ?? "Enter value";
        return `TextField("${placeholder}", text: .constant("${component.value ?? ""}"))`;
      }

      if (component.type === "image") {
        return `Image(systemName: "${component.systemImage ?? "star.fill"}")`;
      }

      if (component.type === "spacer") {
        return "Spacer()";
      }

      return [
        "RoundedRectangle(cornerRadius: 12)",
        "    .fill(Color(.secondarySystemBackground))",
        "    .overlay(Text(\"Card\").padding())",
        "    .frame(height: 120)",
      ].join("\n");
    }),
  );
}
