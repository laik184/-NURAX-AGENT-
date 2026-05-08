export { executePipeline, getMetrics } from './orchestrator.ts';
export { dispatch, dispatchById, getRegistryStats, ORCHESTRATOR_REGISTRY, WORKER_DISPATCH_DOMAINS } from './registry/dispatcher.ts';
export type { OrchestratorEntry, OrchestratorDomain } from './registry/orchestrator.registry.ts';
export {
  PHASE_ORCHESTRATOR_REGISTRY,
  PLATFORM_SERVICES_REGISTRY,
  FORBIDDEN_DISPATCH_IDS,
  FORBIDDEN_DISPATCH_DOMAINS,
  assertRegistryIntegrity,
} from './registry/orchestrator.registry.ts';
export type {
  PipelineInput,
  PipelineOutput,
  PipelinePhase,
  PipelineStatus,
  PipelineState,
  PhaseResult,
  SafetyCheckResult,
  PipelineMetrics,
} from './types.ts';
