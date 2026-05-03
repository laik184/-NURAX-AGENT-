import { transitionState } from "../state.js";
import type { AgentResult, DockerComposeState, ServiceConfig } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { toEnvVarName } from "../utils/name-normalizer.util.js";

const SOURCE = "env-builder";

export interface EnvBuilderInput {
  readonly projectName: string;
  readonly services: readonly ServiceConfig[];
  readonly globalEnv?: Readonly<Record<string, string>>;
  readonly state: Readonly<DockerComposeState>;
}

export interface EnvBuilderOutput extends AgentResult {
  readonly enrichedServices: readonly ServiceConfig[];
  readonly globalEnv: Readonly<Record<string, string>>;
}

function buildDefaultServiceEnv(
  svc: ServiceConfig,
  projectName: string,
): Readonly<Record<string, string>> {
  const baseEnv: Record<string, string> = {
    SERVICE_NAME: svc.name,
    PROJECT_NAME: projectName,
    NODE_ENV: "production",
  };

  if (svc.role === "database") {
    const dbName = toEnvVarName(svc.name);
    return Object.freeze({
      ...baseEnv,
      POSTGRES_DB: dbName,
      POSTGRES_USER: "appuser",
      POSTGRES_PASSWORD: "${DB_PASSWORD}",
    });
  }

  if (svc.role === "cache") {
    return Object.freeze({ ...baseEnv });
  }

  if (svc.role === "backend" || svc.role === "worker") {
    return Object.freeze({
      ...baseEnv,
      PORT: String(svc.ports?.[0]?.container ?? 3000),
    });
  }

  return Object.freeze(baseEnv);
}

function enrichService(
  svc: ServiceConfig,
  projectName: string,
  globalEnv: Readonly<Record<string, string>>,
): ServiceConfig {
  const defaultEnv = buildDefaultServiceEnv(svc, projectName);
  const merged: Record<string, string> = {
    ...defaultEnv,
    ...globalEnv,
    ...(svc.environment ?? {}),
  };
  return Object.freeze({ ...svc, environment: Object.freeze(merged) });
}

export function buildEnv(input: EnvBuilderInput): Readonly<EnvBuilderOutput> {
  const { projectName, services, globalEnv = {}, state } = input;

  const enrichedServices = services.map((svc) => enrichService(svc, projectName, globalEnv));
  const frozen = Object.freeze(enrichedServices);

  const mergedEnv = Object.freeze({ ...globalEnv });

  const log = buildLog(
    SOURCE,
    `Injected environment into ${frozen.length} service(s) with ${Object.keys(globalEnv).length} global var(s)`,
  );

  return {
    nextState: transitionState(state, { services: frozen, env: mergedEnv, appendLog: log }),
    output: Object.freeze({
      success: true,
      compose: "",
      services: Object.freeze(frozen.map((s) => s.name)),
      logs: Object.freeze([log]),
    }),
    enrichedServices: frozen,
    globalEnv: mergedEnv,
  };
}
