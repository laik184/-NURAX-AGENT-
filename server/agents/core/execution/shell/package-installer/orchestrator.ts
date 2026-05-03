import { detectPackageManager } from "./agents/manager-detector.agent.js";
import { runInstall } from "./agents/install-runner.agent.js";
import { runUpdate } from "./agents/update-runner.agent.js";
import { runRemove } from "./agents/remove-runner.agent.js";
import { parseInstallError } from "./agents/error-parser.agent.js";
import { validateDependencies } from "./agents/dependency-validator.agent.js";
import {
  appendError,
  appendLog,
  getInstallerState,
  resetInstallerState,
  setManager,
  setPackages,
  setStatus,
} from "./state.js";
import { createLogger } from "./utils/logger.util.js";
import type { InstallOperation, PackageInstallInput, PackageInstallResult } from "./types.js";

async function executeOperation(
  operation: InstallOperation,
  input: Readonly<PackageInstallInput>,
): Promise<Readonly<PackageInstallResult>> {
  resetInstallerState();
  const logger = createLogger();

  const packages = [...new Set(input.packages ?? [])];
  if ((input.packages ?? []).length !== packages.length) {
    logger.info("Duplicate packages detected and removed before execution");
  }

  setPackages(packages);
  setStatus("RUNNING");
  appendLog(`${operation} started`);

  const manager = await detectPackageManager(input.projectPath);
  setManager(manager);
  logger.info(`Detected package manager: ${manager}`);

  const validation = await validateDependencies(input.projectPath, packages);
  if (!validation.valid) {
    setStatus("FAILED");
    appendError(validation.error ?? "Validation failed");
    logger.error(validation.error ?? "Validation failed");

    const failedOutput: PackageInstallResult = {
      success: false,
      manager,
      installed: [],
      failed: packages,
      logs: logger.entries,
      error: validation.error ?? "Validation failed",
    };

    return Object.freeze(failedOutput);
  }

  const sharedOptions = {
    cwd: input.options?.cwd ?? input.projectPath,
    timeoutMs: input.options?.timeoutMs ?? 120_000,
    isDev: input.options?.isDev,
    exact: input.options?.exact,
  };

  const result =
    operation === "install"
      ? await runInstall(manager, packages, sharedOptions)
      : operation === "update"
        ? await runUpdate(manager, packages, sharedOptions)
        : await runRemove(manager, packages, sharedOptions);

  logger.info(`Executed command: ${result.command}`);

  if (!result.ok) {
    const parsedError = parseInstallError(result.stderr, result.timedOut);
    setStatus("FAILED");
    appendError(parsedError.message);
    logger.error(parsedError.message);

    const failureOutput: PackageInstallResult = {
      success: false,
      manager,
      installed: [],
      failed: packages,
      logs: logger.entries,
      error: `${parsedError.message} ${parsedError.suggestion}`,
    };

    return Object.freeze(failureOutput);
  }

  setStatus("SUCCESS");
  appendLog(`${operation} completed`);

  const installed = result.parsedPackages.length > 0 ? result.parsedPackages : packages;
  const output: PackageInstallResult = {
    success: true,
    manager,
    installed,
    logs: logger.entries,
  };

  return Object.freeze(output);
}

export async function orchestrateInstall(input: Readonly<PackageInstallInput>): Promise<Readonly<PackageInstallResult>> {
  return executeOperation("install", input);
}

export async function orchestrateUpdate(input: Readonly<PackageInstallInput>): Promise<Readonly<PackageInstallResult>> {
  return executeOperation("update", input);
}

export async function orchestrateRemove(input: Readonly<PackageInstallInput>): Promise<Readonly<PackageInstallResult>> {
  return executeOperation("remove", input);
}

export function getPackageInstallerState() {
  return getInstallerState();
}
