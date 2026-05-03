export function buildResponseCloneExpression(responseVar = "response"): string {
  return `${responseVar}.clone()`;
}
