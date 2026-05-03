import { AppShellInput } from '../types.js';
import { minifyCss } from '../utils/css-minifier.util.js';

const BASE_CSS = `
  :root {
    color-scheme: light dark;
    --bg: #0b1220;
    --fg: #e2e8f0;
    --surface: #1e293b;
    --muted: #334155;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--fg); }
  .app-shell__header { min-height: 56px; display: flex; align-items: center; padding: 0 16px; background: var(--surface); }
  #app-root { min-height: calc(100vh - 56px); }
  .app-shell__skeleton { padding: 16px; display: grid; gap: 12px; }
  .skeleton { border-radius: 8px; background: linear-gradient(90deg, var(--muted), #475569, var(--muted)); background-size: 200% 100%; animation: pulse 1.4s ease-in-out infinite; }
  .skeleton--hero { height: 220px; }
  .skeleton--line { height: 16px; }
  @keyframes pulse { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
`;

const strategyCss = (strategy: AppShellInput['loadingStrategy']): string => {
  if (strategy === 'aggressive') {
    return '#app-root{content-visibility:auto;contain-intrinsic-size:1px 1100px;}';
  }

  if (strategy === 'conservative') {
    return '.app-shell__skeleton{animation:none;}';
  }

  return '.app-shell__skeleton{opacity:0.98;}';
};

export const criticalCssAgent = (input: AppShellInput): string =>
  minifyCss(`${BASE_CSS}${strategyCss(input.loadingStrategy)}`);
