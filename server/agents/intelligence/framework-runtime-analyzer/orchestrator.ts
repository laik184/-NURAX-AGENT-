import { analyzeAnomalyDetectorAgent } from './agents/anomaly-detector.agent';
import { analyzeAsyncFlowAgent } from './agents/async-flow.agent';
import { analyzeExecutionPathAgent } from './agents/execution-path.agent';
import { analyzeLifecycleDetectorAgent } from './agents/lifecycle-detector.agent';
import { analyzeRuntimeFlowAgent } from './agents/runtime-flow.agent';
import { INITIAL_RUNTIME_ANALYZER_STATE } from './state';
import type { FrameworkRuntimeInput, RuntimeAnalyzerOutput } from './types';
import { deepFreeze } from './utils/deep-freeze.util';

export const frameworkRuntimeAnalyzerOrchestrator = (
  input: FrameworkRuntimeInput,
): RuntimeAnalyzerOutput => {
  const runtimeFlow = analyzeRuntimeFlowAgent(input);
  const lifecycle = analyzeLifecycleDetectorAgent(input);
  const asyncFlow = analyzeAsyncFlowAgent(input);
  const executionPaths = analyzeExecutionPathAgent(input);
  const anomalies = analyzeAnomalyDetectorAgent(input);

  const logs = [
    ...runtimeFlow.logs,
    ...lifecycle.logs,
    ...asyncFlow.logs,
    ...executionPaths.logs,
    ...anomalies.logs,
  ];

  return deepFreeze({
    success: true,
    logs,
    data: {
      ...INITIAL_RUNTIME_ANALYZER_STATE,
      runtimeFlow: runtimeFlow.data,
      lifecycle: lifecycle.data,
      asyncFlow: asyncFlow.data,
      executionPaths: executionPaths.data,
      anomalies: anomalies.data,
    },
  });
};
