import type { SafetyInput, SafetyResult } from "./types";
import { detectThreats } from "./agents/threat-detector.agent";
import { analyzeChain } from "./agents/chain-analyzer.agent";
import { evaluateRisk } from "./agents/risk-evaluator.agent";
import { enforcePolicy } from "./agents/policy-enforcer.agent";
import { checkOverride } from "./agents/override-controller.agent";
import { guardAction } from "./agents/action-guard.agent";
import { recordDecision } from "./state";

function validateInput(input: SafetyInput): string | null {
  if (!input || typeof input !== "object") return "input must be an object";
  if (!input.action || typeof input.action !== "string" || !input.action.trim()) {
    return "action is required and cannot be empty";
  }
  if (input.chain !== undefined && !Array.isArray(input.chain)) {
    return "chain must be an array of strings if provided";
  }
  return null;
}

export function runGlobalSafetyCheck(input: SafetyInput): SafetyResult {
  const allLogs: string[] = [];

  function fail(message: string): SafetyResult {
    allLogs.push(`[global-safety] FATAL: ${message}`);
    return { success: false, logs: allLogs, error: message };
  }

  try {
    const validationError = validateInput(input);
    if (validationError) return fail(validationError);

    const action = input.action.trim();
    const context = (input.context ?? "").trim();
    const chain = Array.isArray(input.chain) ? input.chain.filter((s) => typeof s === "string") : [];
    const isAdmin = input.isAdmin === true;

    allLogs.push(`[global-safety] starting check — action="${action.slice(0, 60)}${action.length > 60 ? "..." : ""}" isAdmin=${isAdmin} chainSteps=${chain.length}`);

    // STEP 1: Detect threats in action + context
    const threatOut = detectThreats(action, context);
    allLogs.push(...threatOut.logs);
    if (!threatOut.success || !threatOut.report) return fail(threatOut.error ?? "threat detection failed");
    const threatReport = threatOut.report;

    // STEP 2: Analyze action chain for compounding risk
    const chainOut = analyzeChain(chain);
    allLogs.push(...chainOut.logs);
    if (!chainOut.success || !chainOut.chainRisk) return fail(chainOut.error ?? "chain analysis failed");
    const chainRisk = chainOut.chainRisk;

    // STEP 3: Evaluate numeric risk score
    const riskOut = evaluateRisk(threatReport, chainRisk);
    allLogs.push(...riskOut.logs);
    if (!riskOut.success || riskOut.riskScore === undefined || !riskOut.riskLevel) {
      return fail(riskOut.error ?? "risk evaluation failed");
    }
    const { riskScore, riskLevel } = riskOut;

    // STEP 4: Enforce system policies
    const policyOut = enforcePolicy(action, context);
    allLogs.push(...policyOut.logs);
    if (!policyOut.success || !policyOut.policyResult) return fail(policyOut.error ?? "policy enforcement failed");
    const policyResult = policyOut.policyResult;

    // STEP 5: Check override eligibility
    const overrideOut = checkOverride(isAdmin, riskScore, riskLevel);
    allLogs.push(...overrideOut.logs);
    if (!overrideOut.success || !overrideOut.override) return fail(overrideOut.error ?? "override check failed");
    const override = overrideOut.override;

    // STEP 6: Final gate — allow or block
    const guardOut = guardAction(riskScore, riskLevel, policyResult, override, threatReport.detected);
    allLogs.push(...guardOut.logs);
    if (!guardOut.success || !guardOut.decision) return fail(guardOut.error ?? "action guard failed");
    const { decision, blockedBy } = guardOut;

    // Persist to state
    recordDecision(action, decision, riskScore, threatReport.threats, isAdmin);

    allLogs.push(
      `[global-safety] complete — decision=${decision} riskScore=${riskScore} riskLevel=${riskLevel} threats=${threatReport.threats.length}`
    );

    return {
      success: true,
      logs: allLogs,
      decision,
      riskScore,
      riskLevel,
      threats: threatReport.threats,
      ...(blockedBy ? { blockedBy } : {}),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
}
