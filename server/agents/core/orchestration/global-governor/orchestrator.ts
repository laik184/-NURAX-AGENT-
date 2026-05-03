import type { GovernorInput, GovernorOutput, NormalizedDecision } from "./types";
import { normalizeDecisions } from "./agents/decision-normalizer.agent";
import { detectConflicts } from "./agents/conflict-detector.agent";
import { evaluatePriority } from "./agents/priority-evaluator.agent";
import { evaluateRisk } from "./agents/risk-evaluator.agent";
import { evaluateConfidence } from "./agents/confidence-evaluator.agent";
import { arbitrate } from "./agents/arbitration.agent";
import { enforceSafety } from "./agents/safety-enforcer.agent";
import { finalize } from "./agents/finalizer.agent";
import { recordSession, incrementBlocked } from "./state";
import { logEntry } from "./utils/logger.util";

export function govern(input: GovernorInput): GovernorOutput {
  const allLogs: string[] = [];
  const allowDestructive = input.allowDestructive ?? false;
  const minConfidence = input.minConfidenceThreshold ?? 0.25;

  function fail(message: string): GovernorOutput {
    allLogs.push(logEntry("global-governor", `FATAL: ${message}`));
    return { success: false, logs: allLogs, error: message };
  }

  try {
    allLogs.push(logEntry("global-governor", `session=${input.sessionId} decisions=${input.decisions.length} allowDestructive=${allowDestructive} minConfidence=${minConfidence}`));

    // STEP 1: Normalize
    const normOut = normalizeDecisions(input.decisions);
    allLogs.push(...normOut.logs);
    if (!normOut.success || !normOut.normalized) return fail(normOut.error ?? "normalization failed");
    const normalized: NormalizedDecision[] = normOut.normalized;

    // STEP 2: Detect conflicts
    const conflictOut = detectConflicts(normalized);
    allLogs.push(...conflictOut.logs);
    if (!conflictOut.success || !conflictOut.conflicts) return fail(conflictOut.error ?? "conflict detection failed");
    const conflicts = conflictOut.conflicts;

    // STEP 3a: Evaluate priority
    const prioOut = evaluatePriority(normalized);
    allLogs.push(...prioOut.logs);
    if (!prioOut.success || !prioOut.priorityScores) return fail(prioOut.error ?? "priority evaluation failed");

    // STEP 3b: Evaluate risk
    const riskOut = evaluateRisk(normalized);
    allLogs.push(...riskOut.logs);
    if (!riskOut.success || !riskOut.riskScores) return fail(riskOut.error ?? "risk evaluation failed");

    // STEP 3c: Evaluate confidence
    const confOut = evaluateConfidence(normalized);
    allLogs.push(...confOut.logs);
    if (!confOut.success || !confOut.confidenceScores) return fail(confOut.error ?? "confidence evaluation failed");

    // STEP 4: Arbitrate — select the best candidate
    const arbOut = arbitrate(normalized, prioOut.priorityScores, riskOut.riskScores, confOut.confidenceScores);
    allLogs.push(...arbOut.logs);
    if (!arbOut.success || !arbOut.selectedDecision || !arbOut.scores) return fail(arbOut.error ?? "arbitration failed");

    let candidate = arbOut.selectedDecision;
    const allScores = arbOut.scores;

    // STEP 5: Safety enforcement — if blocked, try next-best decision in score order
    const blockedIds: string[] = [];
    let finalCandidate: NormalizedDecision | null = null;

    for (const score of allScores) {
      const d = normalized.find((n) => n.id === score.decisionId);
      if (!d) continue;

      const safeOut = enforceSafety(d, normalized, allowDestructive, minConfidence);
      allLogs.push(...safeOut.logs);

      if (!safeOut.success) return fail(safeOut.error ?? "safety check failed");

      if (!safeOut.allowed) {
        if (safeOut.blockedDecisionIds) blockedIds.push(...safeOut.blockedDecisionIds);
        continue;
      }

      finalCandidate = d;
      break;
    }

    if (!finalCandidate) {
      incrementBlocked(blockedIds.length);
      return fail(`all ${normalized.length} decision(s) blocked by safety enforcer`);
    }

    if (finalCandidate.id !== candidate.id) {
      allLogs.push(logEntry("global-governor", `top candidate id=${candidate.id} blocked — falling back to id=${finalCandidate.id}`));
      candidate = finalCandidate;
    }

    incrementBlocked(blockedIds.length);

    // STEP 6: Finalize
    const finalOut = finalize(input.sessionId, candidate, conflicts, allScores, blockedIds, allLogs);
    allLogs.push(...finalOut.logs);
    if (!finalOut.success || !finalOut.output) return fail(finalOut.error ?? "finalization failed");

    // Record session
    recordSession({
      sessionId: input.sessionId,
      decisions: input.decisions,
      selectedDecision: finalOut.output.data!.finalDecision,
      conflicts,
      scores: allScores,
      logs: allLogs,
      resolvedAt: finalOut.output.data!.resolvedAt,
    });

    allLogs.push(logEntry("global-governor", `RESOLVED session=${input.sessionId} final_action=${candidate.action} target=${candidate.target}`));
    return finalOut.output;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
}
