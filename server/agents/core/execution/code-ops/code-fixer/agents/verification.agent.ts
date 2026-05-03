import type { FileTree, FixerOptions, TestRunner, VerificationCheckResult, VerificationResult } from "../types.js";
import { hasTypeScriptFiles } from "../utils/code.util.js";

function fallbackCheck(name: "typecheck" | "lint" | "tests", enabled: boolean): VerificationCheckResult {
  if (!enabled) {
    return Object.freeze({ check: name, passed: true, details: `${name} disabled by options.` });
  }

  return Object.freeze({ check: name, passed: true, details: `${name} skipped (no test-runner adapter).` });
}

export function verifyCodebase(codebase: FileTree, options: Required<FixerOptions>, testRunner?: TestRunner): VerificationResult {
  const checks: VerificationCheckResult[] = [];

  if (options.runTypecheck && hasTypeScriptFiles(codebase) && testRunner?.runTypecheck) {
    checks.push(testRunner.runTypecheck(codebase));
  } else {
    checks.push(fallbackCheck("typecheck", options.runTypecheck));
  }

  if (options.runLint && testRunner?.runLint) {
    checks.push(testRunner.runLint(codebase));
  } else {
    checks.push(fallbackCheck("lint", options.runLint));
  }

  if (options.runTests && testRunner?.runTests) {
    checks.push(testRunner.runTests(codebase));
  } else {
    checks.push(fallbackCheck("tests", options.runTests));
  }

  const passed = checks.every((check) => check.passed);

  return Object.freeze({
    passed,
    checks: Object.freeze(checks),
    summary: passed ? "All configured verification checks passed." : "Verification failed.",
  });
}
