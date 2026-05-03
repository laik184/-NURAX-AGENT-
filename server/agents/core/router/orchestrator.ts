import { RouterInput, RouterResult } from "./types";
import { detectIntent } from "./agents/intent-detector.agent";
import { mapDomain } from "./agents/domain-mapper.agent";
import { selectAgent } from "./agents/agent-selector.agent";
import { scoreConfidence } from "./agents/confidence-scorer.agent";
import { fallbackRoute } from "./agents/fallback-router.agent";
import { recordRoute } from "./state";
import { applyPatterns } from "./utils/pattern-matcher.util";
import { DOMAIN_PATTERNS } from "./utils/pattern-matcher.util";
import { extractKeywords } from "./utils/keyword-matcher.util";
import { isLowConfidence } from "./utils/scoring.util";

const CONFIDENCE_FALLBACK_THRESHOLD = 0.3;

export function route(input: RouterInput): RouterResult {
  const logs: string[] = [];
  const timestamp = Date.now();

  try {
    logs.push(`[router] Routing: "${input.input.slice(0, 80)}"`);

    const detected = detectIntent(input.input);
    logs.push(`[router] Intent: ${detected.intent} (confidence=${detected.confidence})`);

    const mapping = mapDomain(input.input, detected.intent);
    logs.push(`[router] Domain: ${mapping.domain}, Module: ${mapping.module} — ${mapping.reason}`);

    const selection = selectAgent(input.input, mapping.module, mapping.domain, detected.intent);
    logs.push(`[router] Agent: ${selection.agent}`);

    const patternResults = applyPatterns(input.input, DOMAIN_PATTERNS);
    const patternWeight = patternResults[0]?.totalWeight ?? 0;
    const keywordCount = extractKeywords(input.input).length;

    const confidence = scoreConfidence(
      input.input,
      detected.intent,
      mapping.domain,
      detected.confidence,
      keywordCount,
      patternWeight,
      input.context !== undefined
    );
    logs.push(`[router] Confidence: ${confidence.score}`);

    if (isLowConfidence(confidence.score) && confidence.score < CONFIDENCE_FALLBACK_THRESHOLD) {
      logs.push(`[router] Confidence below threshold (${confidence.score} < ${CONFIDENCE_FALLBACK_THRESHOLD}) — triggering fallback`);
      const fallback = fallbackRoute(input, `confidence=${confidence.score}`);
      const finalLogs = [...logs, ...fallback.logs];

      recordRoute({
        input: input.input,
        domain: fallback.domain,
        module: fallback.module,
        agent: fallback.agent,
        confidence: fallback.confidence,
        timestamp,
        success: fallback.success,
      });

      return Object.freeze({ ...fallback, logs: Object.freeze(finalLogs) });
    }

    const result: RouterResult = Object.freeze({
      success: true,
      domain: mapping.domain,
      module: mapping.module,
      agent: selection.agent,
      confidence: confidence.score,
      logs: Object.freeze(logs),
    });

    recordRoute({
      input: input.input,
      domain: result.domain,
      module: result.module,
      agent: result.agent,
      confidence: result.confidence,
      timestamp,
      success: true,
    });

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logs.push(`[router] Error: ${error}`);

    const fallback = fallbackRoute(input, `exception: ${error}`);
    const finalLogs = [...logs, ...fallback.logs];

    recordRoute({
      input: input.input,
      domain: fallback.domain,
      module: fallback.module,
      agent: fallback.agent,
      confidence: 0,
      timestamp,
      success: false,
    });

    return Object.freeze({
      ...fallback,
      error,
      logs: Object.freeze(finalLogs),
    });
  }
}
