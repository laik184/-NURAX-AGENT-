import { transitionState } from "../state.js";
import type { AgentResult, DockerComposeState, NetworkConfig, ServiceConfig } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { normalizeNetworkName } from "../utils/name-normalizer.util.js";

const SOURCE = "network-builder";

export interface NetworkBuilderInput {
  readonly projectName: string;
  readonly services: readonly ServiceConfig[];
  readonly extraNetworks?: readonly NetworkConfig[];
  readonly state: Readonly<DockerComposeState>;
}

export interface NetworkBuilderOutput extends AgentResult {
  readonly networks: readonly NetworkConfig[];
  readonly defaultNetworkName: string;
}

export function buildNetworks(input: NetworkBuilderInput): Readonly<NetworkBuilderOutput> {
  const { projectName, services, extraNetworks = [], state } = input;

  const defaultNetworkName = normalizeNetworkName(projectName);

  const networks: NetworkConfig[] = [
    Object.freeze({
      name: defaultNetworkName,
      driver: "bridge" as const,
      labels: Object.freeze({
        "com.docker.compose.project": projectName,
      }),
    }),
  ];

  const declaredNetworkNames = new Set(
    services.flatMap((s) => s.networks ?? []),
  );

  for (const name of declaredNetworkNames) {
    if (name !== defaultNetworkName && !networks.some((n) => n.name === name)) {
      networks.push(
        Object.freeze({
          name,
          driver: "bridge" as const,
        }),
      );
    }
  }

  for (const extra of extraNetworks) {
    if (!networks.some((n) => n.name === extra.name)) {
      networks.push(extra);
    }
  }

  const frozen = Object.freeze(networks);
  const log = buildLog(
    SOURCE,
    `Defined ${frozen.length} network(s): ${frozen.map((n) => n.name).join(", ")}`,
  );

  return {
    nextState: transitionState(state, { networks: frozen, appendLog: log }),
    output: Object.freeze({
      success: true,
      compose: "",
      services: Object.freeze([]),
      logs: Object.freeze([log]),
    }),
    networks: frozen,
    defaultNetworkName,
  };
}
