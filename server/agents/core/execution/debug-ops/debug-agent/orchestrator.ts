import { dependencyCheckerAgent } from './agents/dependency-checker.agent.js';
import { environmentCheckerAgent } from './agents/environment-checker.agent.js';
import { errorClassifierAgent } from './agents/error-classifier.agent.js';
import { fixSuggesterAgent } from './agents/fix-suggester.agent.js';
import { rootCauseAnalyzerAgent } from './agents/root-cause-analyzer.agent.js';
import { stacktraceParserAgent } from './agents/stacktrace-parser.agent.js';
import { createInitialState, DebugAgentState } from './state.js';
import { DebugInput, DebugResult } from './types.js';
import { scoreConfidence } from './utils/confidence-score.util.js';
import { formatLog } from './utils/logger.util.js';

const updateState = (state: Readonly<DebugAgentState>, patch: Partial<DebugAgentState>): Readonly<DebugAgentState> =>
  Object.freeze({ ...state, ...patch });

export const analyzeError = (input: DebugInput): Readonly<DebugResult> => {
  let state = createInitialState(input.error, input.logs ?? [], input.stacktrace ?? []);
  state = updateState(state, { status: 'ANALYZING', logs: [...state.logs, formatLog('INFO', 'Analysis started')] });

  const parsed = stacktraceParserAgent(input.error, state.logs, input.stacktrace);
  const errorType = errorClassifierAgent(input.error, parsed.normalized);
  const rootCause = rootCauseAnalyzerAgent(errorType, input.error, parsed.frames);
  const dependency = dependencyCheckerAgent(input.error, parsed.normalized, parsed.frames);
  const environment = environmentCheckerAgent(input.error, parsed.normalized, input.environment ?? {});
  const suggestions = fixSuggesterAgent({
    errorType,
    missingModules: dependency.missingModules,
    missingEnvKeys: environment.missingEnvKeys,
    rootCause: rootCause.summary,
  });

  const confidence = scoreConfidence([
    { weight: 0.2, matched: parsed.frames.length > 0 },
    { weight: 0.25, matched: errorType !== 'UNKNOWN' },
    { weight: 0.3, matched: rootCause.evidence.length > 0 },
    { weight: 0.15, matched: suggestions.length > 0 },
    { weight: 0.1, matched: dependency.hasDependencyIssue || environment.hasEnvironmentIssue || errorType !== 'UNKNOWN' },
  ]);

  state = updateState(state, {
    stacktrace: parsed.normalized,
    type: errorType,
    rootCause: rootCause.summary,
    confidence,
    suggestions: suggestions.map((suggestion) => suggestion.action),
    status: 'DONE',
    logs: [...state.logs, formatLog('INFO', `Analysis complete with type ${errorType}`)],
  });

  const output: DebugResult = {
    success: state.status === 'DONE',
    errorType,
    rootCause: state.rootCause,
    confidence: state.confidence,
    suggestions: state.suggestions,
    logs: state.logs,
  };

  return Object.freeze(output);
};

export const getRootCause = (input: DebugInput): string => analyzeError(input).rootCause;

export const suggestFix = (input: DebugInput): string[] => analyzeError(input).suggestions;
