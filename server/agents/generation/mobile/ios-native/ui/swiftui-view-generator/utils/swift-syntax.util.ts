export function indentBlock(input: string, spaces = 4): string {
  const indent = " ".repeat(spaces);
  return input
    .split("\n")
    .map((line) => (line.length > 0 ? `${indent}${line}` : line))
    .join("\n");
}

export function toSwiftLiteral(value: unknown): string {
  if (typeof value === 'string') return `"${value.replace(/"/g, '\\"')}"`;
  if (value === null || value === undefined) return '""';
  return `"${String(value)}"`;
}

export function indentLines(input: string, spaces = 4): string {
  const indent = " ".repeat(spaces);
  return input
    .split("\n")
    .map((line) => (line.length > 0 ? `${indent}${line}` : line))
    .join("\n");
}

export function buildViewStruct(name: string, body: string): string {
  return [
    "import SwiftUI",
    "",
    `struct ${name}: View {`,
    "    var body: some View {",
    indentLines(body, 8),
    "    }",
    "}",
    "",
    `#Preview {`,
    `    ${name}()`,
    "}",
  ].join("\n");
}
