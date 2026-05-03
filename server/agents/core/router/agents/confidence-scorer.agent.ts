import { Intent, Domain, ConfidenceScore } from "../types";
import { computeConfidence, buildFactors, isHighConfidence, isMediumConfidence } from "../utils/scoring.util";

export function scoreConfidence(
  input: string,
  intent: Intent,
  domain: Domain,
  intentConfidence: number,
  keywordMatchCount: number,
  patternWeight: number,
  hasContext: boolean
): ConfidenceScore {
  const intentIsKnown = intent !== "unknown";
  const domainIsKnown = domain !== "unknown";

  const base = computeConfidence(keywordMatchCount, patternWeight, hasContext, intentIsKnown);

  let adjusted = base;
  if (!domainIsKnown) adjusted = Math.max(adjusted - 0.1, 0);
  adjusted = Math.min(adjusted * 0.6 + intentConfidence * 0.4, 1);
  adjusted = Math.round(adjusted * 100) / 100;

  const factors = buildFactors(keywordMatchCount, patternWeight, hasContext, intentIsKnown);

  return Object.freeze({
    score: adjusted,
    factors: Object.freeze({
      ...factors,
      domainKnown: domainIsKnown ? 1 : 0,
      intentConfidence,
      qualityTier: isHighConfidence(adjusted) ? 1 : isMediumConfidence(adjusted) ? 0.5 : 0,
    }),
  });
}
