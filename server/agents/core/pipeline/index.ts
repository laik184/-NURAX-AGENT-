export { executePipeline, getMetrics } from './orchestrator.ts';
export { dispatch, dispatchById, getRegistryStats, ORCHESTRATOR_REGISTRY } from './registry/dispatcher.ts';
export type { OrchestratorEntry, OrchestratorDomain } from './registry/orchestrator.registry.ts';
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
