import { collapseWhitespace, stripMarkdownSyntax } from "../utils/string-cleaner.util";

export const cleanMarkdownResponse = (rawResponse: string): string => {
  const markdownStripped = stripMarkdownSyntax(rawResponse);
  return collapseWhitespace(markdownStripped);
};
