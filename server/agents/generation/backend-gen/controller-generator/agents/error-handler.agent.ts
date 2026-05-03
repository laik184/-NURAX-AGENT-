import { indentBlock } from "../utils/code-formatter.util.js";

export function withErrorHandling(bodyCode: string): string {
  const wrapped = [
    "try {",
    indentBlock(bodyCode, 2),
    "} catch (error) {",
    "  const message = error instanceof Error ? error.message : \"Unhandled controller error\";",
    "  return res.status(500).json({ success: false, error: message });",
    "}",
  ];

  return wrapped.join("\n");
}
