import type { SupportedFramework } from '../types';

export interface TemplateBundle {
  readonly pageTemplate: string;
  readonly routeTemplate: string;
  readonly stateTemplate: string;
  readonly seoTemplate: string;
}

export function loadTemplateBundle(framework: SupportedFramework): TemplateBundle {
  const base: Record<SupportedFramework, TemplateBundle> = {
    react: {
      pageTemplate: `import React from 'react';\n\nexport function {{PAGE_COMPONENT}}() {\n  return (\n    <main>\n      {{HEADER}}\n      {{BODY}}\n      {{FOOTER}}\n    </main>\n  );\n}`,
      routeTemplate: `export const route = {\n  path: '{{ROUTE_PATH}}',\n  element: <{{PAGE_COMPONENT}} />,\n};`,
      stateTemplate: `export const usePageState = () => ({ loading: false });`,
      seoTemplate: `document.title = '{{TITLE}}';`,
    },
    next: {
      pageTemplate: `export default function {{PAGE_COMPONENT}}() {\n  return (\n    <main>\n      {{HEADER}}\n      {{BODY}}\n      {{FOOTER}}\n    </main>\n  );\n}`,
      routeTemplate: `// Next.js route mapped by file-system path: {{ROUTE_PATH}}`,
      stateTemplate: `export const pageState = { loading: false };`,
      seoTemplate: `export const metadata = { title: '{{TITLE}}' };`,
    },
    vue: {
      pageTemplate: `<template>\n  <main>\n    {{HEADER}}\n    {{BODY}}\n    {{FOOTER}}\n  </main>\n</template>\n\n<script setup lang=\"ts\">\n</script>`,
      routeTemplate: `export const route = { path: '{{ROUTE_PATH}}', component: () => import('./{{PAGE_COMPONENT}}.vue') };`,
      stateTemplate: `export const usePageStore = () => ({ loading: false });`,
      seoTemplate: `useHead({ title: '{{TITLE}}' });`,
    },
  };

  return base[framework];
}
