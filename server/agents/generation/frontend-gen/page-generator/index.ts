import { runPageGeneration } from './orchestrator';
import { getPageGeneratorState } from './state';
import type { PageResult, PageSpec } from './types';

export function validatePage(spec: PageSpec): boolean {
  return Boolean(
    spec.pageName.trim()
      && spec.routePath.trim()
      && spec.framework
      && spec.pageType
      && spec.stateManager,
  );
}

export function generatePage(spec: PageSpec): PageResult {
  if (!validatePage(spec)) {
    return Object.freeze({
      success: false,
      pageName: spec.pageName,
      files: Object.freeze([]),
      logs: Object.freeze(['index:validation-failed']),
      error: 'Invalid page spec.',
    });
  }

  return runPageGeneration(spec);
}

export function getPageStructure() {
  return getPageGeneratorState();
}

export type { PageSpec, PageResult, ComponentSpec, LayoutSpec } from './types';
