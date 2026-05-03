import { ErrorType, FixSuggestion } from '../types.js';

export interface FixSuggesterInput {
  errorType: ErrorType;
  missingModules: string[];
  missingEnvKeys: string[];
  rootCause: string;
}

const sortByConfidence = (suggestions: FixSuggestion[]): FixSuggestion[] =>
  [...suggestions].sort((a, b) => b.confidence - a.confidence);

export const fixSuggesterAgent = ({ errorType, missingModules, missingEnvKeys, rootCause }: FixSuggesterInput): FixSuggestion[] => {
  const suggestions: FixSuggestion[] = [];

  if (errorType === 'DEPENDENCY' || missingModules.length > 0) {
    suggestions.push({
      action: `Install/restore missing modules: ${missingModules.join(', ') || 'verify lockfile and package.json alignment'}`,
      reason: 'Dependency resolution failures directly block module loading during runtime.',
      confidence: 0.95,
    });
  }

  if (errorType === 'ENVIRONMENT' || missingEnvKeys.length > 0) {
    suggestions.push({
      action: `Provide required environment keys: ${missingEnvKeys.join(', ') || 'inspect env schema and runtime secrets'}`,
      reason: 'Missing environment configuration commonly causes boot/runtime failures.',
      confidence: 0.92,
    });
  }

  if (errorType === 'SYNTAX') {
    suggestions.push({
      action: 'Fix syntax at the first reported failing frame and rerun compilation checks.',
      reason: 'Parser failures prevent execution before business logic is reached.',
      confidence: 0.9,
    });
  }

  if (errorType === 'NETWORK') {
    suggestions.push({
      action: 'Validate endpoint DNS/host, service availability, and timeout/retry settings.',
      reason: 'Connectivity and endpoint mismatches typically trigger network-level exceptions.',
      confidence: 0.86,
    });
  }

  if (errorType === 'RUNTIME') {
    suggestions.push({
      action: 'Guard null/undefined paths and add input validation around failing callsite.',
      reason: 'Runtime type/value assumptions are likely invalid in current execution context.',
      confidence: 0.82,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      action: 'Capture extended logs with debug mode and rerun to improve signal quality.',
      reason: rootCause,
      confidence: 0.4,
    });
  }

  return sortByConfidence(suggestions);
};
