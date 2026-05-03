import config, { appConfig } from "../../../../config/index.js";
import type { DeploymentConfig } from "../types.js";
import { parseEnvVars } from "../utils/env-parser.util.js";
import { formatLog } from "../utils/log-formatter.util.js";

export interface EnvironmentResolution {
  readonly environment: string;
  readonly vars: Readonly<Record<string, string>>;
  readonly logs: readonly string[];
}

export function resolveEnvironment(configInput: DeploymentConfig): EnvironmentResolution {
  const resolvedEnvironment = configInput.environment || appConfig.env;
  const vars = parseEnvVars({
    APP_NAME: "nura-x-deployer",
    APP_PORT: String(appConfig.port),
    NODE_ENV: resolvedEnvironment,
  });

  const logs = Object.freeze([
    formatLog("environment-resolver", `Resolved environment: ${resolvedEnvironment}`),
    formatLog("environment-resolver", `Loaded ${Object.keys(vars).length} environment variables`),
  ]);

  return Object.freeze({
    environment: resolvedEnvironment,
    vars,
    logs,
  });
}
