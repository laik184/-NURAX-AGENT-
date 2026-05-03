const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const dedupeDeclarations = (css: string): string => {
  const blocks = css.split('}').map((block) => block.trim()).filter(Boolean);

  const dedupedBlocks = blocks.map((block) => {
    const [selectorRaw, declarationRaw] = block.split('{');
    if (!selectorRaw || !declarationRaw) {
      return '';
    }

    const selector = collapseWhitespace(selectorRaw);
    const declarations = declarationRaw
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean);

    const uniqueDeclarations = Object.freeze(Array.from(new Set(declarations)));
    return `${selector}{${uniqueDeclarations.join(';')}}`;
  });

  return dedupedBlocks.filter(Boolean).join('');
};

export const minifyCss = (css: string): string => {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const compactWhitespace = collapseWhitespace(withoutComments)
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}');

  return dedupeDeclarations(compactWhitespace);
};
