import { buildLayout } from './agents/layout-builder.agent';
import { composeComponents } from './agents/component-composer.agent';
import { bindData } from './agents/data-binding.agent';
import { integrateApi } from './agents/api-integration.agent';
import { integrateState } from './agents/state-integrator.agent';
import { integrateRouting } from './agents/routing-integrator.agent';
import { integrateSeoMeta } from './agents/seo-meta.agent';
import { setPageGeneratorState } from './state';
import type { PageGenerationContext, PageResult, PageSpec } from './types';

export function runPageGeneration(spec: PageSpec): PageResult {
  const baseContext: PageGenerationContext = {
    spec,
    files: [],
    components: [],
    routes: [],
    apiCalls: [],
    logs: [],
  };

  setPageGeneratorState({
    pageName: spec.pageName,
    components: [],
    routes: [],
    apiCalls: [],
    status: 'GENERATING',
    logs: ['orchestrator:start'],
    errors: [],
  });

  try {
    const withLayout = buildLayout(baseContext);
    const withComponents = composeComponents(withLayout);
    const withBindings = bindData(withComponents);
    const withApi = integrateApi(withBindings);
    const withState = integrateState(withApi);
    const withRouting = integrateRouting(withState);
    const completed = integrateSeoMeta(withRouting);

    const logs = ['orchestrator:start', ...completed.logs, 'orchestrator:done'];
    setPageGeneratorState({
      pageName: spec.pageName,
      components: [...completed.components],
      routes: [...completed.routes],
      apiCalls: [...completed.apiCalls],
      status: 'SUCCESS',
      logs,
      errors: [],
    });

    const output: PageResult = {
      success: true,
      pageName: spec.pageName,
      files: Object.freeze([...completed.files]),
      logs: Object.freeze(logs),
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Page generation failed.';
    const logs = ['orchestrator:start', 'orchestrator:failed'];
    setPageGeneratorState({
      pageName: spec.pageName,
      components: [],
      routes: [],
      apiCalls: [],
      status: 'FAILED',
      logs,
      errors: [message],
    });

    const output: PageResult = {
      success: false,
      pageName: spec.pageName,
      files: Object.freeze([]),
      logs: Object.freeze(logs),
      error: message,
    };

    return Object.freeze(output);
  }
}
