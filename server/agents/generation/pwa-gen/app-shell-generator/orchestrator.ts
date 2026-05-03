import { criticalCssAgent } from './agents/critical-css.agent.js';
import { dynamicImportAgent } from './agents/dynamic-import.agent.js';
import { hydrationStrategyAgent } from './agents/hydration-strategy.agent.js';
import { preloadStrategyAgent } from './agents/preload-strategy.agent.js';
import { shellLayoutAgent } from './agents/shell-layout.agent.js';
import { createAppShellState } from './state.js';
import { AppShellInput, AppShellOutput } from './types.js';
import { buildHtmlShell } from './utils/html-template.util.js';

export const appShellGeneratorOrchestrator = (input: AppShellInput): AppShellOutput => {
  const logs: string[] = [];

  const state = createAppShellState(input);
  logs.push(`State initialized with ${state.routes.length} route(s).`);

  const layout = shellLayoutAgent(input);
  logs.push('Shell layout generated.');

  const criticalCSS = criticalCssAgent(input);
  logs.push('Critical CSS generated and minified.');

  const preloadLinks = preloadStrategyAgent(input);
  logs.push(`Preload strategy generated ${preloadLinks.length} preload hint(s).`);

  const lazyChunks = dynamicImportAgent(input);
  logs.push(`Dynamic import plan generated for ${lazyChunks.length} route chunk(s).`);

  const hydrationPlan = hydrationStrategyAgent(input);
  logs.push(`Hydration strategy resolved in ${hydrationPlan.mode} mode.`);

  const htmlShell = buildHtmlShell({ layout, criticalCSS, preloadLinks, hydrationPlan });
  logs.push('HTML shell assembled.');

  return Object.freeze({
    success: true,
    logs: Object.freeze([...logs]),
    data: Object.freeze({
      htmlShell,
      criticalCSS,
      preloadLinks,
      lazyChunks,
      hydrationPlan,
    }),
  });
};
