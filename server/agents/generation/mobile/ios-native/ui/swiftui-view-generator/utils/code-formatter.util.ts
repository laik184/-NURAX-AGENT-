export function formatViewCode(code: string): string {
  return code
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .concat("\n");
}
