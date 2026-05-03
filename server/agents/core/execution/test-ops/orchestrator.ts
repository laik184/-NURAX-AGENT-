import { initializeTestRun } from "./agents/test-runner.agent.js";
import { discoverTests } from "./agents/test-discovery.agent.js";
import { executeTests } from "./agents/test-executor.agent.js";
import { parseResults } from "./agents/result-parser.agent.js";
import { analyzeCoverage } from "./agents/coverage-analyzer.agent.js";
import { analyzeFailures } from "./agents/failure-analyzer.agent.js";

import { getState, resetState, updateState } from "./state.js";
import type { RunnerConfig, TestResult } from "./types.js";

export async function runTestOrchestration(config: RunnerConfig = {}): Promise<TestResult> {
  resetState();

  const runContext = initializeTestRun(config);
  updateState((current) => ({ ...current, status: "RUNNING", logs: [...current.logs, ...runContext.logs] }));

  try {
    const discovery = await discoverTests(runContext.config.cwd ?? process.cwd());
    updateState((current) => ({ ...current, logs: [...current.logs, ...discovery.logs] }));

    const execution = await executeTests(runContext.config, discovery.files);
    updateState((current) => ({ ...current, logs: [...current.logs, ...execution.logs] }));

    const parsed = parseResults(execution.stdout, execution.stderr, execution.exitCode);
    updateState((current) => ({
      ...current,
      tests: parsed.tests,
      passed: parsed.testResult.passed,
      failed: parsed.testResult.failed,
      logs: [...current.logs, ...parsed.logs],
      errors: parsed.testResult.error ? [...current.errors, parsed.testResult.error] : current.errors,
    }));

    const coverage = analyzeCoverage(execution.stdout);
    updateState((current) => ({
      ...current,
      coverage: coverage.report.percentage,
      logs: [...current.logs, ...coverage.logs],
    }));

    const failure = analyzeFailures(execution.stdout, execution.stderr);
    updateState((current) => ({
      ...current,
      failureReport: failure.report,
      logs: [...current.logs, ...failure.logs],
      status: parsed.testResult.success ? "SUCCESS" : "FAILED",
    }));

    const snapshot = getState();
    const output: TestResult = Object.freeze({
      success: snapshot.status === "SUCCESS",
      passed: snapshot.passed,
      failed: snapshot.failed,
      coverage: snapshot.coverage,
      logs: snapshot.logs,
      error: snapshot.errors[0],
    });

    updateState((current) => ({ ...current, lastResult: output }));
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown orchestration error";

    updateState((current) => ({
      ...current,
      status: "FAILED",
      errors: [...current.errors, message],
      logs: [...current.logs, `[test-ops][ERROR] ${message}`],
      lastResult: {
        success: false,
        passed: current.passed,
        failed: current.failed,
        coverage: current.coverage,
        logs: [...current.logs],
        error: message,
      },
    }));

    const snapshot = getState();
    return Object.freeze({
      success: false,
      passed: snapshot.passed,
      failed: snapshot.failed,
      coverage: snapshot.coverage,
      logs: snapshot.logs,
      error: message,
    });
  }
}
