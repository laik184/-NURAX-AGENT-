export function pxToRem(px: number, base = 16): string {
  return `${(px / base).toFixed(4).replace(/\.?0+$/, "")}rem`;
}

export function pxToEm(px: number, context = 16): string {
  return `${(px / context).toFixed(4).replace(/\.?0+$/, "")}em`;
}
