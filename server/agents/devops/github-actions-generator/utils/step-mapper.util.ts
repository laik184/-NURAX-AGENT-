import type { Language, StepConfig, WorkflowConfig } from "../types.js";
import { getLanguageDefaults, getCheckoutStep, getCacheStep } from "./template.util.js";

export function buildSetupStep(config: WorkflowConfig): StepConfig {
  const defaults = getLanguageDefaults(config.language);

  if (!defaults.setupAction) {
    return Object.freeze({
      name: "Setup environment",
      run: "echo 'Generic environment — no setup action required'",
    });
  }

  const version =
    config.language === "node"
      ? (config.nodeVersion ?? defaults.defaultVersion)
      : config.language === "python"
      ? (config.pythonVersion ?? defaults.defaultVersion)
      : defaults.defaultVersion;

  return Object.freeze({
    name: `Setup ${config.language}`,
    uses: defaults.setupAction,
    with: Object.freeze({ [defaults.versionInput]: version }),
  });
}

export function buildInstallStep(config: WorkflowConfig): StepConfig {
  const defaults = getLanguageDefaults(config.language);
  let cmd = defaults.installCommand;

  if (config.language === "node" && config.packageManager) {
    const pm = config.packageManager;
    if (pm === "yarn") cmd = "yarn install --frozen-lockfile";
    if (pm === "pnpm") cmd = "pnpm install --frozen-lockfile";
    if (pm === "npm") cmd = "npm ci";
  }

  if (config.language === "python" && config.packageManager === "poetry") {
    cmd = "poetry install --no-root";
  }

  return Object.freeze({
    name: "Install dependencies",
    run: cmd,
    ...(config.workingDirectory ? { workingDirectory: config.workingDirectory } : {}),
  });
}

export function buildLintStep(config: WorkflowConfig): StepConfig {
  const defaults = getLanguageDefaults(config.language);
  const cmd = config.lintCommand ?? defaults.lintCommand;
  return Object.freeze({
    name: "Lint",
    run: cmd,
    ...(config.workingDirectory ? { workingDirectory: config.workingDirectory } : {}),
  });
}

export function buildTestStep(config: WorkflowConfig): StepConfig {
  const defaults = getLanguageDefaults(config.language);
  const cmd = config.testCommand ?? defaults.testCommand;
  return Object.freeze({
    name: "Run tests",
    run: cmd,
    ...(config.workingDirectory ? { workingDirectory: config.workingDirectory } : {}),
  });
}

export function buildBuildStep(config: WorkflowConfig): StepConfig {
  const defaults = getLanguageDefaults(config.language);
  const cmd = config.buildCommand ?? defaults.buildCommand;
  return Object.freeze({
    name: "Build",
    run: cmd,
    ...(config.workingDirectory ? { workingDirectory: config.workingDirectory } : {}),
  });
}

export function buildCiSteps(config: WorkflowConfig): readonly StepConfig[] {
  return Object.freeze([
    getCheckoutStep(),
    getCacheStep(config.language, config.packageManager),
    buildSetupStep(config),
    buildInstallStep(config),
    buildLintStep(config),
    buildTestStep(config),
    buildBuildStep(config),
  ]);
}

export function buildDeployStep(config: WorkflowConfig, environment: string): StepConfig {
  const cmd = config.deployCommand ?? `echo "Deploy to ${environment}"`;
  return Object.freeze({
    name: `Deploy to ${environment}`,
    run: cmd,
    env: buildDeployEnv(config, environment),
  });
}

function buildDeployEnv(
  config: WorkflowConfig,
  environment: string,
): Readonly<Record<string, string>> {
  const vars: Record<string, string> = {
    DEPLOY_ENV: environment.toUpperCase(),
  };

  if (config.envVars) {
    for (const envVar of config.envVars.filter((e) => e.secret)) {
      vars[envVar.name] = `\${{ secrets.${envVar.name} }}`;
    }
  }

  return Object.freeze(vars);
}

export function resolveLanguage(lang: string | undefined): Language {
  const valid: Language[] = ["node", "python", "go", "java", "rust", "generic"];
  if (valid.includes(lang as Language)) return lang as Language;
  return "generic";
}
