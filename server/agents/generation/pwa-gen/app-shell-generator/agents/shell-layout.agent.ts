import { AppShellInput, ShellLayout } from '../types.js';

export const shellLayoutAgent = (input: AppShellInput): ShellLayout => {
  const header = `<header class="app-shell__header"><h1>${input.appName}</h1></header>`;
  const root = '<main id="app-root" aria-busy="true"></main>';
  const fallback =
    '<noscript><p class="app-shell__noscript">JavaScript is required for full interactivity.</p></noscript>';

  return Object.freeze({
    documentTitle: `${input.appName} | App Shell`,
    lang: input.lang ?? 'en',
    bodyMarkup: `${header}${root}${fallback}`,
    skeletonMarkup:
      '<section class="app-shell__skeleton" aria-hidden="true"><div class="skeleton skeleton--hero"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line"></div></section>',
  });
};
