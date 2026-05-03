import type { FrameworkType, Route } from '../types.js';

const escape = (value: string): string => value.replace(/'/g, "\\'");

export const loadBackendTemplate = (framework: FrameworkType, routes: readonly Route[]): string => {
  const lines = routes.map((route) => `  { method: '${route.method ?? 'GET'}', path: '${escape(route.routePath)}' },`);

  if (framework === 'nestjs') {
    return [
      'export const generatedNestRoutes = Object.freeze([',
      ...lines,
      ']);',
      '',
      'export default generatedNestRoutes;',
    ].join('\n');
  }

  if (framework === 'fastify') {
    return [
      'export const generatedFastifyRoutes = Object.freeze([',
      ...lines,
      ']);',
      '',
      'export default generatedFastifyRoutes;',
    ].join('\n');
  }

  return ['export const generatedExpressRoutes = Object.freeze([', ...lines, ']);', '', 'export default generatedExpressRoutes;'].join(
    '\n',
  );
};

export const loadFrontendTemplate = (framework: FrameworkType, routes: readonly Route[]): string => {
  const lines = routes.map((route) => `  { path: '${escape(route.routePath)}', element: '${route.handlerName}' },`);

  if (framework === 'nextjs') {
    return [
      'export const generatedNextPages = Object.freeze([',
      ...lines,
      ']);',
      '',
      'export default generatedNextPages;',
    ].join('\n');
  }

  if (framework === 'vue-router') {
    return [
      'export const generatedVueRoutes = Object.freeze([',
      ...lines,
      ']);',
      '',
      'export default generatedVueRoutes;',
    ].join('\n');
  }

  return ['export const generatedReactRoutes = Object.freeze([', ...lines, ']);', '', 'export default generatedReactRoutes;'].join(
    '\n',
  );
};
