import type {
  RawInput,
  ImmutableRefinedGoal,
  IntelligenceResult,
  RefinementPhase,
} from "./types.js";
import * as state              from "./state.js";
import { refinePrompt }        from "./agents/prompt-refinement.agent.js";
import { extractIntent }       from "./agents/intent-extractor.agent.js";
import { resolveAmbiguity }    from "./agents/ambiguity-resolver.agent.js";
import { mapCapabilities }     from "./agents/capability-mapper.agent.js";
import { buildStrategyHint }   from "./agents/strategy-hint.agent.js";
import { computeOverallConfidence } from "./utils/confidence-calculator.util.js";

let _goalCounter = 0;

function makeGoalId(): string {
  _goalCounter += 1;
  return `ig-${Date.now()}-${String(_goalCounter).padStart(4, "0")}`;
}

function makeSessionId(rawInput: RawInput): string {
  return rawInput.sessionId ?? `il-session-${Date.now()}`;
}

function fail(
  error: string,
  code:  string,
  phase: RefinementPhase,
): IntelligenceResult<ImmutableRefinedGoal> {
  state.setPhase("failed");
  return Object.freeze({ ok: false, error, code, phase });
}

export function refine(rawInput: RawInput): IntelligenceResult<ImmutableRefinedGoal> {

  if (!rawInput.text || rawInput.text.trim().length === 0) {
    return fail("rawInput.text must be a non-empty string.", "ERR_EMPTY_TEXT", "idle");
  }

  const sessionId = makeSessionId(rawInput);
  state.initSession(rawInput, sessionId);

  // ── Phase 1: Prompt Refinement ──────────────────────────────────────────────
  state.setPhase("prompt-refinement");
  const refinedPrompt = refinePrompt(rawInput);
  state.setRefinedPrompt(refinedPrompt);

  if (refinedPrompt.wordCount === 0) {
    return fail("Prompt produced zero words after normalization.", "ERR_EMPTY_PROMPT", "prompt-refinement");
  }

  // ── Phase 2: Intent Extraction ──────────────────────────────────────────────
  state.setPhase("intent-extraction");
  const intent = extractIntent(refinedPrompt);
  state.setIntent(intent);

  // ── Phase 3: Ambiguity Resolution ───────────────────────────────────────────
  state.setPhase("ambiguity-resolution");
  const ambiguityReport = resolveAmbiguity(refinedPrompt, intent);
  state.setAmbiguityReport(ambiguityReport);

  // ── Phase 4: Capability Mapping ─────────────────────────────────────────────
  state.setPhase("capability-mapping");
  const capabilityMap = mapCapabilities(refinedPrompt, intent);
  state.setCapabilityMap(capabilityMap);

  if (capabilityMap.capabilities.length === 0) {
    return fail("Capability mapping produced no capabilities.", "ERR_NO_CAPABILITIES", "capability-mapping");
  }

  // ── Phase 5: Strategy Hinting ───────────────────────────────────────────────
  state.setPhase("strategy-hinting");
  const strategyHint = buildStrategyHint(intent, ambiguityReport, capabilityMap);
  state.setStrategyHint(strategyHint);

  // ── Final: Compute confidence + Assemble ────────────────────────────────────
  state.setPhase("complete");

  const overallConfidence = computeOverallConfidence({
    promptClarity:   refinedPrompt.languageConfidence,
    intentCertainty: intent.confidence,
    ambiguityScore:  ambiguityReport.overallAmbiguity,
    capabilityCover: capabilityMap.coverageScore,
    strategyFit:     strategyHint.hints.length > 0 ? 0.9 : 0.5,
  });

  const readyForPlanning = overallConfidence >= 0.45 && !ambiguityReport.isHighlyAmbiguous;

  const refinedGoal = Object.freeze<ImmutableRefinedGoal>({
    goalId:            makeGoalId(),
    sessionId,
    refinedAt:         Date.now(),
    rawInput:          Object.freeze(rawInput),
    refinedPrompt,
    intent,
    ambiguityReport,
    capabilityMap,
    strategyHint,
    overallConfidence,
    readyForPlanning,
  });

  return Object.freeze<IntelligenceResult<ImmutableRefinedGoal>>({
    ok:    true,
    data:  refinedGoal,
    phase: "complete",
  });
}

export function getActiveSession() {
  return state.getSession();
}

export function resetIntelligence(): void {
  state.clearSession();
}
