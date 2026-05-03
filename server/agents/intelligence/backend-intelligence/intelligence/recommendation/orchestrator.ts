import { generateActions }         from "./agents/action.generator.agent.js";
import { buildExplanations }       from "./agents/explanation.builder.agent.js";
import { buildFixRecommendations } from "./agents/fix-recommendation.agent.js";
import { suggestImprovements }     from "./agents/improvement.suggester.agent.js";
import {
  createEmptyRecommendationState,
  toResponse,
  withCandidates,
  withRecommendations,
} from "./state.js";
import type { RecommendationInput, RecommendationResponse } from "./types.js";
import {
  applyConsistency,
  applyPriority,
  sortByPriority,
  toPriorityMap,
  toTruthMap,
} from "./utils/candidate.util.js";
import { dedupeCandidates }      from "./utils/dedupe.util.js";
import { formatRecommendations } from "./utils/format.util.js";
import { groupFindings }         from "./utils/grouping.util.js";

export function buildRecommendations(input: RecommendationInput): RecommendationResponse {
  if (!input.analysis || input.analysis.findings.length === 0) {
    return Object.freeze({ total: 0, recommendations: Object.freeze([]) });
  }

  let state = createEmptyRecommendationState();

  const grouped     = groupFindings(input.analysis.findings);
  const priorityMap = toPriorityMap(input.priority?.priorities);
  const truthMap    = toTruthMap(input);

  const normalized = sortByPriority(
    dedupeCandidates(applyConsistency(applyPriority(grouped, priorityMap), truthMap)),
  );

  state = withCandidates(state, normalized);

  if (state.candidates.length === 0) {
    return toResponse(state);
  }

  const suggestions     = suggestImprovements(state.candidates);
  const fixes           = buildFixRecommendations(state.candidates);
  const actions         = generateActions(state.candidates);
  const explanations    = buildExplanations(state.candidates, input.context);
  const recommendations = formatRecommendations(
    state.candidates, suggestions, fixes, actions, explanations,
  );

  state = withRecommendations(state, recommendations);
  return toResponse(state);
}
