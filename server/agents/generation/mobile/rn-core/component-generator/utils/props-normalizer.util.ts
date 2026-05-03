import type { ComponentRequest } from "../types.js";
import { mergeStyles } from "./style-merger.util.js";

const DEFAULT_PROPS: Readonly<Record<ComponentRequest["type"], Readonly<Record<string, unknown>>>> =
  Object.freeze({
    view: Object.freeze({ testID: "generated-view" }),
    text: Object.freeze({ children: "Generated Text" }),
    button: Object.freeze({ title: "Press Me", onPress: "handlePress" }),
    list: Object.freeze({ horizontal: false, showsVerticalScrollIndicator: false }),
    input: Object.freeze({ placeholder: "Type here", autoCorrect: false }),
    image: Object.freeze({ resizeMode: "cover", source: { uri: "https://example.com/image.png" } }),
    modal: Object.freeze({ visible: true, animationType: "fade", transparent: true }),
    icon: Object.freeze({ name: "home", size: 24, color: "#111827" }),
  });

function cleanProps(props: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  const cleaned = Object.entries(props).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    if (typeof value === "string" && value.trim().length === 0) return acc;

    acc[key] = value;
    return acc;
  }, {});

  return Object.freeze(cleaned);
}

export function normalizeComponentProps(
  request: Readonly<ComponentRequest>,
): Readonly<Record<string, unknown>> {
  const defaults = DEFAULT_PROPS[request.type] ?? Object.freeze({});
  const defaultsRecord = defaults as Readonly<Record<string, unknown>>;
  const rawBaseStyle = defaultsRecord["style"];
  const baseStyle =
    typeof rawBaseStyle === "object" && rawBaseStyle !== null && !Array.isArray(rawBaseStyle)
      ? (rawBaseStyle as Readonly<Record<string, unknown>>)
      : Object.freeze({});

  const mergedStyle = mergeStyles(baseStyle, request.style ?? Object.freeze({}));

  const mergedProps = Object.freeze({
    ...defaultsRecord,
    ...(request.props ?? Object.freeze({})),
    ...(request.children !== undefined ? { children: request.children } : {}),
    style: mergedStyle,
  });

  return cleanProps(mergedProps);
}
