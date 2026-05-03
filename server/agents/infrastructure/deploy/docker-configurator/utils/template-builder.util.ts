export const joinTemplateSections = (sections: ReadonlyArray<string>): string =>
  `${sections.filter(Boolean).join('\n\n').trim()}\n`;
