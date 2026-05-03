export function formatCodeBlock(code: string): string {
  return code
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

export function formatLog(step: string, detail: string): string {
  return `[form-generator] ${step}: ${detail}`;
}
