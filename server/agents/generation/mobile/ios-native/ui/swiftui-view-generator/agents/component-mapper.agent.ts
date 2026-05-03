import type { ComponentConfig } from "../types.js";
import { indentBlock, toSwiftLiteral } from "../utils/swift-syntax.util.js";

function mapText(props: Readonly<Record<string, unknown>>): string {
  return `Text(${toSwiftLiteral(props.content ?? "")})`;
}

function mapImage(props: Readonly<Record<string, unknown>>): string {
  return `Image(${toSwiftLiteral(props.name ?? "photo")})`;
}

function mapButton(props: Readonly<Record<string, unknown>>): string {
  const label = toSwiftLiteral(props.title ?? "Tap");
  return `Button(${label}) {\n  // UI action placeholder\n}`;
}

function mapComponentNode(component: Readonly<ComponentConfig>): string {
  const props = component.props ?? Object.freeze({});

  switch (component.type) {
    case "text":
      return mapText(props);
    case "image":
      return mapImage(props);
    case "button":
      return mapButton(props);
    case "spacer":
      return "Spacer()";
    default:
      return "EmptyView()";
  }
}

export function mapComponentToSwiftUI(component: Readonly<ComponentConfig>): string {
  const componentNode = mapComponentNode(component);

  if (!component.children || component.children.length === 0) {
    return componentNode;
  }

  const childrenCode = component.children.map(mapComponentToSwiftUI).join("\n");
  return `VStack {\n${indentBlock(componentNode)}\n${indentBlock(childrenCode)}\n}`;
}
