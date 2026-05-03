import { INLINE_BACKTICK_REGEX, MARKDOWN_DECORATOR_REGEX } from "./regex.util";

export const collapseWhitespace = (value: string): string =>
  value.replace(/\r/g, "").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ").trim();

export const stripMarkdownSyntax = (value: string): string => {
  const withoutDecorators = value.replace(MARKDOWN_DECORATOR_REGEX, "$1");
  return withoutDecorators.replace(INLINE_BACKTICK_REGEX, "$1").trim();
};

export const stripFenceMarkers = (value: string): string =>
  value
    .replace(/^```[a-zA-Z0-9_-]*\s*/g, "")
    .replace(/```$/g, "")
    .trim();
