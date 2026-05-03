import { buildServices } from "./agents/service-builder.agent.js";
import { buildNetworks } from "./agents/network-builder.agent.js";
import { buildVolumes } from "./agents/volume-builder.agent.js";
import { buildEnv } from "./agents/env-builder.agent.js";
import { mapDependencies } from "./agents/dependency-mapper.agent.js";
import { validateCompose } from "./agents/compose-validator.agent.js";
import { INITIAL_STATE, transitionState } from "./state.js";
import type {
  AgentResult,
  ComposeFile,
  ComposeResult,
  DockerComposeState,
  NetworkConfig,
  ServiceConfig,
  VolumeConfig,
} from "./types.js";
import { buildError, buildLog } from "./utils/logger.util.js";
import { buildComposeYaml, getComposeVersion } from "./utils/yaml-builder.util.js";
import { normalizeNetworkName } from "./utils/name-normalizer.util.js";

const SOURCE = "orchestrator";

export interface GenerateComposeInput {
  readonly projectName: string;
  readonly services: readonly ServiceConfig[];
  readonly globalEnv?: Readonly<Record<string, string>>;
  readonly extraNetworks?: readonly NetworkConfig[];
  readonly extraVolumes?: readonly VolumeConfig[];
}

function fail(
  state: Readonly<DockerComposeState>,
  error: string,
  message: string,
): Readonly<AgentResult> {
  return {
    nextState: transitionState(state, {
      status: "FAILED",
      appendError: buildError(SOURCE, message),
      appendLog: buildLog(SOURCE, message),
    }),
    output: Object.freeze({
      success: false,
      compose: "",
      services: Object.freeze([]),
      logs: Object.freeze([buildLog(SOURCE, message)]),
      error,
    }),
  };
}

export function generateCompose(
  input: GenerateComposeInput,
  currentState: Readonly<DockerComposeState> = INITIAL_STATE,
): Readonly<AgentResult> {
  const { projectName, services, globalEnv, extraNetworks, extraVolumes } = input;

  if (!projectName || projectName.trim() === "") {
    return fail(currentState, "invalid_input", "projectName is required");
  }
  if (!services || services.length === 0) {
    return fail(currentState, "invalid_input", "At least one service is required");
  }

  let state = transitionState(currentState, { status: "BUILDING" });

  const defaultNetworkName = normalizeNetworkName(projectName);

  const serviceResult = buildServices({ services, networkName: defaultNetworkName, state });
  state = serviceResult.nextState;
  if (!serviceResult.output.success) return serviceResult;

  const networkResult = buildNetworks({
    projectName,
    services: serviceResult.services,
    extraNetworks,
    state,
  });
  state = networkResult.nextState;

  const volumeResult = buildVolumes({
    services: serviceResult.services,
    extraVolumes,
    state,
  });
  state = volumeResult.nextState;

  const enrichedServicesWithVolumes = serviceResult.services.map((svc) => {
    const volMappings = volumeResult.serviceVolumeMappings[svc.name];
    if (!volMappings || volMappings.length === 0) return svc;
    const existing = svc.volumes ?? [];
    const merged = [...new Set([...existing, ...volMappings])];
    return Object.freeze({ ...svc, volumes: Object.freeze(merged) });
  });

  const envResult = buildEnv({
    projectName,
    services: enrichedServicesWithVolumes,
    globalEnv,
    state,
  });
  state = envResult.nextState;

  const depResult = mapDependencies({ services: envResult.enrichedServices, state });
  state = depResult.nextState;
  if (!depResult.output.success) return depResult;

  const composeFile: ComposeFile = Object.freeze({
    version: getComposeVersion(),
    services: depResult.services,
    networks: networkResult.networks,
    volumes: volumeResult.volumes,
  });

  const validationResult = validateCompose({ file: composeFile, state });
  state = validationResult.nextState;
  if (!validationResult.output.success) return validationResult;

  const yaml = buildComposeYaml(composeFile);
  const log = buildLog(
    SOURCE,
    `Generated docker-compose.yml for "${projectName}" — ` +
    `${composeFile.services.length} service(s), ` +
    `${composeFile.networks.length} network(s), ` +
    `${composeFile.volumes.length} volume(s), ` +
    `${yaml.split("\n").length} lines`,
  );

  const report: ComposeResult = Object.freeze({
    success: true,
    compose: yaml,
    services: Object.freeze(composeFile.services.map((s) => s.name)),
    logs: Object.freeze([
      ...serviceResult.output.logs,
      ...networkResult.output.logs,
      ...volumeResult.output.logs,
      ...envResult.output.logs,
      ...depResult.output.logs,
      ...validationResult.output.logs,
      log,
    ]),
  });

  return {
    nextState: transitionState(state, { status: "SUCCESS", appendLog: log }),
    output: report,
  };
}

export function validateComposeInput(
  input: GenerateComposeInput,
  currentState: Readonly<DockerComposeState> = INITIAL_STATE,
): Readonly<AgentResult> {
  if (!input.projectName || input.projectName.trim() === "") {
    return fail(currentState, "invalid_input", "projectName is required");
  }
  if (!input.services || input.services.length === 0) {
    return fail(currentState, "invalid_input", "At least one service is required");
  }

  const defaultNetworkName = normalizeNetworkName(input.projectName);
  let state = currentState;

  const serviceResult = buildServices({
    services: input.services,
    networkName: defaultNetworkName,
    state,
  });
  state = serviceResult.nextState;
  if (!serviceResult.output.success) return serviceResult;

  const networkResult = buildNetworks({
    projectName: input.projectName,
    services: serviceResult.services,
    state,
  });
  state = networkResult.nextState;

  const volumeResult = buildVolumes({ services: serviceResult.services, state });

  const composeFile: ComposeFile = Object.freeze({
    version: getComposeVersion(),
    services: serviceResult.services,
    networks: networkResult.networks,
    volumes: volumeResult.volumes,
  });

  return validateCompose({ file: composeFile, state });
}

export function getComposeServices(
  input: GenerateComposeInput,
  currentState: Readonly<DockerComposeState> = INITIAL_STATE,
): Readonly<AgentResult> {
  const result = generateCompose(input, currentState);
  if (!result.output.success) return result;

  const log = buildLog(SOURCE, `Services: ${result.output.services.join(", ")}`);
  return {
    nextState: result.nextState,
    output: Object.freeze({
      ...result.output,
      logs: Object.freeze([...result.output.logs, log]),
    }),
  };
}
