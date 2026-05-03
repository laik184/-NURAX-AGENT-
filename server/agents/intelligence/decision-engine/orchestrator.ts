import type { DecisionInput, DecisionOutput, FinalDecision } from './types.ts';
import { createInitialState, withCurrentDecision } from './state.ts';
import { classifyIntent } from './agents/intent-classifier.agent.ts';
import { analyzeContext } from './agents/context-analyzer.agent.ts';
import { mapCapabilities } from './agents/capability-mapper.agent.ts';
import { selectStrategy_ } from './agents/strategy-selector.agent.ts';
import { evaluateRisk } from './agents/risk-evaluator.agent.ts';
import { scoreDecision } from './agents/decision-scorer.agent.ts';
import { resolveFallback } from './agents/fallback-decision.agent.ts';
import { deepFreeze } from './utils/deep-freeze.util.ts';

export function runDecisionEngine(input: DecisionInput): DecisionOutput {
  const logs: string[] = [];
  let state = createInitialState();

  logs.push(`[decision-engine] START requestId=${input.requestId}`);

  const intent = classifyIntent(input);
  logs.push(`[intent-classifier] intent=${intent.intent} confidence=${intent.confidence.toFixed(2)}`);

  const context = analyzeContext(input, intent);
  logs.push(`[context-analyzer] domain=${context.domain} complexity=${context.complexity} steps=${context.estimatedSteps}`);

  const capability = mapCapabilities(intent, context, input.availableAgents);
  logs.push(`[capability-mapper] primary=[${capability.primaryAgents.join(', ')}] supporting=[${capability.supportingAgents.join(', ')}]`);

  const strategy = selectStrategy_(intent, context, capability);
  logs.push(`[strategy-selector] strategy=${strategy.strategy} agents=[${strategy.agentSequence.join(', ')}]`);

  const risk = evaluateRisk(intent, context, strategy);
  logs.push(`[risk-evaluator] riskLevel=${risk.riskLevel} failureProb=${risk.failureProbability.toFixed(2)}`);

  const scores = scoreDecision(intent, context, capability, risk);
  logs.push(`[decision-scorer] bestScore=${scores[0]?.score.toFixed(2) ?? 'N/A'} optionId=${scores[0]?.optionId ?? 'N/A'}`);

  const fallback = resolveFallback(intent, context, risk, scores);

  let finalAgents: string[];
  let finalStrategy: typeof strategy.strategy;

  if (fallback.triggered) {
    finalAgents = fallback.fallbackAgents;
    finalStrategy = fallback.fallbackStrategy;
    logs.push(`[fallback-decision] TRIGGERED reason="${fallback.reason}" agents=[${finalAgents.join(', ')}]`);
  } else {
    finalAgents = strategy.agentSequence;
    finalStrategy = strategy.strategy;
    logs.push(`[fallback-decision] not triggered — using primary strategy`);
  }

  const bestScore = scores[0]?.score ?? 0;
  const confidence = Number(
    (intent.confidence * 0.6 + bestScore * 0.4).toFixed(4),
  );

  const decision: FinalDecision = {
    intent: intent.intent,
    selectedStrategy: finalStrategy,
    selectedAgents: finalAgents,
    confidence,
    riskLevel: risk.riskLevel,
  };

  state = withCurrentDecision(state, decision, input.requestId);
  logs.push(`[decision-engine] COMPLETE confidence=${confidence} risk=${risk.riskLevel}`);

  return deepFreeze<DecisionOutput>({
    success: true,
    decision,
    logs,
  });
}
