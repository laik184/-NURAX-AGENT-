import type { FixResult, FixerInput, RawViolation, FixSession, ValidateFixInput } from "../types.js";
import { mapViolations } from "../agents/violation-mapper.agent.js";
import { buildFixPlan } from "../agents/fix-plan-builder.agent.js";
import { generatePatches } from "../agents/patch-generator.agent.js";
import { validateFixes } from "../agents/fix-validator.agent.js";
import { NoopExecutionAdapter } from "../agents/execution-adapter.agent.js";
import { setSession, updateSessionStatus } from "../state.js";

export { type FixerInput };

let _sessionCounter = 0;

export async function runArchitectureFixer(input: FixerInput): Promise<FixResult> {
  const sessionId = `fixer-session-${++_sessionCounter}-${Date.now()}`;

  const mapped = mapViolations(input.violations as readonly RawViolation[]);

  const emptySession: FixSession = Object.freeze({
    id: sessionId,
    violations: mapped.violations,
    plan: Object.freeze({ steps: Object.freeze([]), riskScore: 0, reversible: true, warnings: Object.freeze([]) }),
    status: "INIT",
    patches: Object.freeze([]),
    createdAt: Date.now(),
  });
  setSession(emptySession);

  if (mapped.violations.length === 0) {
    updateSessionStatus("VALIDATED");
    return Object.freeze<FixResult>({
      sessionId,
      applied: false,
      patches: Object.freeze([]),
      validationScore: 100,
      warnings: Object.freeze([...mapped.warnings]),
    });
  }

  const plan = buildFixPlan({ actions: [] });

  const transformResults = plan.steps.map((step) =>
    Object.freeze({
      actionId: step.action.actionId,
      changes: Object.freeze([]),
      warnings: Object.freeze([] as string[]),
    }),
  );

  const patches = generatePatches(transformResults);
  const adapter = new NoopExecutionAdapter();
  const execResult = await adapter.applyPatches(patches);

  const validateInput: ValidateFixInput = Object.freeze({
    patches,
    originalViolationCount: mapped.violations.length,
  });
  const validation = validateFixes(validateInput);

  updateSessionStatus("VALIDATED");

  return Object.freeze<FixResult>({
    sessionId,
    applied: execResult.applied,
    patches: Object.freeze(patches),
    validationScore: validation.result.score,
    warnings: Object.freeze([...mapped.warnings, ...execResult.warnings, ...validation.regressionWarnings]),
  });
}

export function resetFixerState(): void {
  _sessionCounter = 0;
}
