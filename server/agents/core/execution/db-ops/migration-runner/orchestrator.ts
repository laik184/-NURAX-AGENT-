import { executionLoggerAgent } from './agents/execution-logger.agent.js';
import { executionPlannerAgent } from './agents/execution-planner.agent.js';
import { failureHandlerAgent } from './agents/failure-handler.agent.js';
import { migrationRunnerAgent } from './agents/migration-runner.agent.js';
import { scriptLoaderAgent } from './agents/script-loader.agent.js';
import { getExecutionStatus, initializeState, MigrationRunnerState, setState } from './state.js';
import { ExecutionResult, RunMigrationsInput } from './types.js';

export const runMigrations = async (input: RunMigrationsInput): Promise<ExecutionResult> => {
  let state: MigrationRunnerState = initializeState(input.executionId);

  state = setState({
    ...state,
    logs: executionLoggerAgent(state.logs, {
      executionId: state.executionId,
      level: 'INFO',
      step: 'LOAD',
      message: `Loading migration files from ${input.migrationsDir}`,
    }),
  });

  try {
    const scripts = await scriptLoaderAgent(input.migrationsDir);
    const plan = executionPlannerAgent(input.executionId, scripts);

    state = setState({
      ...state,
      migrations: plan.migrations.map((migration) => migration.name),
      logs: executionLoggerAgent(state.logs, {
        executionId: state.executionId,
        level: 'INFO',
        step: 'PLAN',
        message: `Execution plan built with ${plan.migrations.length} migration(s)`,
      }),
    });

    const runOutput = await migrationRunnerAgent(input.dbAdapter, plan);

    const postRunLogs = runOutput.executed.reduce(
      (logs, migrationName) =>
        executionLoggerAgent(logs, {
          executionId: state.executionId,
          level: 'INFO',
          step: 'EXECUTE',
          message: `Executed migration ${migrationName}`,
          migration: migrationName,
        }),
      state.logs,
    );

    if (runOutput.error && runOutput.failed.length > 0) {
      const report = failureHandlerAgent({
        executionId: state.executionId,
        failedMigration: runOutput.failed[0],
        error: runOutput.error,
      });

      const failureLogs = executionLoggerAgent(
        executionLoggerAgent(postRunLogs, {
          executionId: state.executionId,
          level: 'ERROR',
          step: 'EXECUTE',
          message: `Migration failed: ${report.failedMigration}`,
          migration: report.failedMigration,
        }),
        {
          executionId: state.executionId,
          level: 'WARN',
          step: 'ROLLBACK_TRIGGER',
          message: `Rollback trigger prepared for ${report.failedMigration}`,
          migration: report.failedMigration,
        },
      );

      state = setState({
        ...state,
        executed: runOutput.executed,
        failed: runOutput.failed,
        status: 'FAILED',
        logs: failureLogs,
        errors: [...state.errors, runOutput.error],
      });

      const output: ExecutionResult = {
        success: false,
        executed: runOutput.executed,
        failed: runOutput.failed,
        logs: state.logs,
        error: runOutput.error,
      };

      return Object.freeze(output);
    }

    state = setState({
      ...state,
      executed: runOutput.executed,
      failed: [],
      status: 'SUCCESS',
      logs: executionLoggerAgent(postRunLogs, {
        executionId: state.executionId,
        level: 'INFO',
        step: 'COMPLETE',
        message: 'All migrations executed successfully',
      }),
    });

    const output: ExecutionResult = {
      success: true,
      executed: runOutput.executed,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected orchestration failure';

    state = setState({
      ...state,
      status: 'FAILED',
      errors: [...state.errors, message],
      logs: executionLoggerAgent(state.logs, {
        executionId: state.executionId,
        level: 'ERROR',
        step: 'ORCHESTRATOR',
        message,
      }),
    });

    const output: ExecutionResult = {
      success: false,
      executed: state.executed,
      failed: state.failed,
      logs: state.logs,
      error: message,
    };

    return Object.freeze(output);
  }
};

export { getExecutionStatus };
