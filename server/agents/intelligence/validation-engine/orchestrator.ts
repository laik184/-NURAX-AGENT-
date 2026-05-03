import { ValidationInput, ValidationResult, ValidationIssue } from "./types";
import { validateSyntax } from "./agents/syntax-validator.agent";
import { validateContract } from "./agents/contract-validator.agent";
import { validateSchema } from "./agents/schema-validator.agent";
import { validateLogic } from "./agents/logic-validator.agent";
import { validateSecurity } from "./agents/security-validator.agent";
import { validatePerformance } from "./agents/performance-validator.agent";
import { validateConsistency } from "./agents/consistency-validator.agent";
import { deduplicateIssues, normalizeIssues } from "./utils/error-normalizer.util";
import { buildResult, buildErrorResult } from "./utils/result-builder.util";
import { recordValidation } from "./state";

export function validate(input: ValidationInput): ValidationResult {
  const logs: string[] = [];

  try {
    logs.push(`[validation] Starting validation — source="${input.source}", size=${input.code.length}B`);

    const syntaxIssues      = validateSyntax(input);
    logs.push(`[validation] Syntax:      ${syntaxIssues.length} issue(s)`);

    const contractIssues    = validateContract(input);
    logs.push(`[validation] Contract:    ${contractIssues.length} issue(s)`);

    const schemaIssues      = validateSchema(input);
    logs.push(`[validation] Schema:      ${schemaIssues.length} issue(s)`);

    const logicIssues       = validateLogic(input);
    logs.push(`[validation] Logic:       ${logicIssues.length} issue(s)`);

    const securityIssues    = validateSecurity(input);
    logs.push(`[validation] Security:    ${securityIssues.length} issue(s)`);

    const performanceIssues = validatePerformance(input);
    logs.push(`[validation] Performance: ${performanceIssues.length} issue(s)`);

    const consistencyIssues = validateConsistency(input);
    logs.push(`[validation] Consistency: ${consistencyIssues.length} issue(s)`);

    const allIssues: ValidationIssue[] = [
      ...syntaxIssues,
      ...contractIssues,
      ...schemaIssues,
      ...logicIssues,
      ...securityIssues,
      ...performanceIssues,
      ...consistencyIssues,
    ];

    const normalized   = normalizeIssues(allIssues);
    const deduplicated = deduplicateIssues(normalized);
    logs.push(`[validation] Total issues: ${deduplicated.length} (after deduplication)`);

    const result = buildResult(deduplicated, logs);
    logs.push(`[validation] Score: ${result.score} — ${result.success ? "PASSED" : "FAILED"}`);

    recordValidation({
      agentId:    input.agentId,
      score:      result.score,
      issueCount: deduplicated.length,
      success:    result.success,
      timestamp:  Date.now(),
    });

    return buildResult(deduplicated, logs);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logs.push(`[validation] Fatal error: ${error}`);

    recordValidation({
      agentId:    input.agentId,
      score:      0,
      issueCount: 0,
      success:    false,
      timestamp:  Date.now(),
    });

    return buildErrorResult(error, logs);
  }
}

export async function validateParallel(input: ValidationInput): Promise<ValidationResult> {
  const logs: string[] = [];

  try {
    logs.push(`[validation-parallel] Starting parallel validation — source="${input.source}", size=${input.code.length}B`);

    const [
      syntaxIssues,
      contractIssues,
      schemaIssues,
      logicIssues,
      securityIssues,
      performanceIssues,
      consistencyIssues,
    ] = await Promise.all([
      Promise.resolve(validateSyntax(input)),
      Promise.resolve(validateContract(input)),
      Promise.resolve(validateSchema(input)),
      Promise.resolve(validateLogic(input)),
      Promise.resolve(validateSecurity(input)),
      Promise.resolve(validatePerformance(input)),
      Promise.resolve(validateConsistency(input)),
    ]);

    logs.push(`[validation-parallel] All 7 validators completed concurrently`);
    logs.push(`[validation-parallel] Syntax:${syntaxIssues.length} Contract:${contractIssues.length} Schema:${schemaIssues.length} Logic:${logicIssues.length} Security:${securityIssues.length} Performance:${performanceIssues.length} Consistency:${consistencyIssues.length}`);

    const allIssues: ValidationIssue[] = [
      ...syntaxIssues,
      ...contractIssues,
      ...schemaIssues,
      ...logicIssues,
      ...securityIssues,
      ...performanceIssues,
      ...consistencyIssues,
    ];

    const normalized   = normalizeIssues(allIssues);
    const deduplicated = deduplicateIssues(normalized);
    logs.push(`[validation-parallel] Total issues: ${deduplicated.length} (after deduplication)`);

    const result = buildResult(deduplicated, logs);
    logs.push(`[validation-parallel] Score: ${result.score} — ${result.success ? "PASSED" : "FAILED"}`);

    recordValidation({
      agentId:    input.agentId,
      score:      result.score,
      issueCount: deduplicated.length,
      success:    result.success,
      timestamp:  Date.now(),
    });

    return buildResult(deduplicated, logs);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logs.push(`[validation-parallel] Fatal error: ${error}`);

    recordValidation({
      agentId:    input.agentId,
      score:      0,
      issueCount: 0,
      success:    false,
      timestamp:  Date.now(),
    });

    return buildErrorResult(error, logs);
  }
}
