import { HydrationPlan, ShellLayout } from '../types.js';

export interface HtmlTemplateInput {
  layout: ShellLayout;
  criticalCSS: string;
  preloadLinks: ReadonlyArray<string>;
  hydrationPlan: HydrationPlan;
}

const hydrationScript = (plan: HydrationPlan): string => {
  const payload = JSON.stringify(plan);
  return `<script type="application/json" id="hydration-plan">${payload}</script>`;
};

export const buildHtmlShell = ({ layout, criticalCSS, preloadLinks, hydrationPlan }: HtmlTemplateInput): string => {
  const headLines = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="theme-color" content="#0f172a">',
    `<title>${layout.documentTitle}</title>`,
    `<style>${criticalCSS}</style>`,
    ...preloadLinks,
  ];

  return [
    '<!doctype html>',
    `<html lang="${layout.lang}">`,
    '<head>',
    ...headLines,
    '</head>',
    '<body>',
    layout.bodyMarkup,
    layout.skeletonMarkup,
    hydrationScript(hydrationPlan),
    '</body>',
    '</html>',
  ].join('');
};
