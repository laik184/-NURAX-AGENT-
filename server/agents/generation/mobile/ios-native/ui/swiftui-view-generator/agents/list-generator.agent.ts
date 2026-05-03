import type { ListConfig } from "../types.js";
import { indentLines } from "../utils/swift-syntax.util.js";

export function generateListSection(config?: Readonly<ListConfig>): string {
  if (!config?.enabled) {
    return "";
  }

  const bindingName = config.itemBindingName ?? "items";
  const rowViewName = config.rowViewName ?? "Text(item)";
  const rowBlock = [`ForEach(${bindingName}, id: \\.self) { item in`, indentLines(rowViewName), "}"].join("\n");

  if (config.style === "lazyVStack") {
    return ["ScrollView {", indentLines(["LazyVStack {", indentLines(rowBlock), "}"].join("\n")), "}"].join("\n");
  }

  return ["List {", indentLines(rowBlock), "}"].join("\n");
}
