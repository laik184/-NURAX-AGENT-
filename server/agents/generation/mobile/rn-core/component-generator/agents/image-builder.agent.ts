import { buildAccessibilityProps } from "../utils/accessibility.util.js";
import { buildComponentTemplate } from "../utils/component-template.util.js";

export function buildImageComponent(props: Readonly<Record<string, unknown>>): string {
  const accessibility = buildAccessibilityProps(props, "Image", "image");

  const imageProps = {
    ...props,
    ...accessibility,
    defaultSource: props.defaultSource ?? { uri: "https://example.com/fallback.png" },
    fadeDuration: props.fadeDuration ?? 150,
    onError: props.onError ?? "handleImageError",
  };

  return buildComponentTemplate("Image", imageProps);
}
