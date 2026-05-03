import { transitionState } from "../state.js";
import type { AgentResult, DockerComposeState, ServiceConfig } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { normalizeServiceName } from "../utils/name-normalizer.util.js";
import { getDefaultPorts } from "../utils/port-mapper.util.js";
import { resolveBuildContext } from "../utils/path-resolver.util.js";

const SOURCE = "service-builder";

export interface ServiceBuilderInput {
  readonly services: readonly ServiceConfig[];
  readonly networkName: string;
  readonly state: Readonly<DockerComposeState>;
}

export interface ServiceBuilderOutput extends AgentResult {
  readonly services: readonly ServiceConfig[];
}

function normalizeService(svc: ServiceConfig, networkName: string): ServiceConfig {
  const name = normalizeServiceName(svc.name);
  const ports = svc.ports && svc.ports.length > 0 ? svc.ports : getDefaultPorts(svc.role);
  const build = !svc.image ? resolveBuildContext(svc.build, svc.role) : undefined;
  const networks = svc.networks && svc.networks.length > 0 ? svc.networks : [networkName];

  return Object.freeze({
    ...svc,
    name,
    ports,
    networks,
    restart: svc.restart ?? "unless-stopped",
    ...(build !== undefined ? { build } : {}),
  });
}

export function buildServices(input: ServiceBuilderInput): Readonly<ServiceBuilderOutput> {
  const { services, networkName, state } = input;

  if (services.length === 0) {
    const msg = "at least one service is required";
    const errorLog = buildError(SOURCE, msg);
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: errorLog,
        appendLog: buildLog(SOURCE, msg),
      }),
      output: Object.freeze({
        success: false,
        compose: "",
        services: Object.freeze([]),
        logs: Object.freeze([buildLog(SOURCE, msg)]),
        error: "no_services",
      }),
      services: Object.freeze([]),
    };
  }

  const built = services.map((svc) => normalizeService(svc, networkName));
  const frozen = Object.freeze(built);

  const log = buildLog(
    SOURCE,
    `Built ${built.length} service(s): ${built.map((s) => s.name).join(", ")}`,
  );

  return {
    nextState: transitionState(state, { services: frozen, appendLog: log }),
    output: Object.freeze({
      success: true,
      compose: "",
      services: Object.freeze(built.map((s) => s.name)),
      logs: Object.freeze([log]),
    }),
    services: frozen,
  };
}
