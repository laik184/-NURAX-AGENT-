import { transitionState } from "../state.js";
import type { AgentResult, DockerComposeState, ServiceConfig, VolumeConfig } from "../types.js";
import { buildLog } from "../utils/logger.util.js";
import { normalizeVolumeName } from "../utils/name-normalizer.util.js";
import { getDefaultVolumePath } from "../utils/path-resolver.util.js";

const SOURCE = "volume-builder";

export interface VolumeBuilderInput {
  readonly services: readonly ServiceConfig[];
  readonly extraVolumes?: readonly VolumeConfig[];
  readonly state: Readonly<DockerComposeState>;
}

export interface VolumeBuilderOutput extends AgentResult {
  readonly volumes: readonly VolumeConfig[];
  readonly serviceVolumeMappings: Readonly<Record<string, readonly string[]>>;
}

function buildVolumeMapping(svc: ServiceConfig): { volumeConfig: VolumeConfig; mountPath: string } | null {
  const defaultPath = getDefaultVolumePath(svc.role);
  if (!defaultPath) return null;

  const volumeName = normalizeVolumeName(svc.name);
  return {
    volumeConfig: Object.freeze({
      name: volumeName,
      type: "named" as const,
    }),
    mountPath: `${volumeName}:${defaultPath}`,
  };
}

export function buildVolumes(input: VolumeBuilderInput): Readonly<VolumeBuilderOutput> {
  const { services, extraVolumes = [], state } = input;

  const volumes: VolumeConfig[] = [];
  const serviceVolumeMappings: Record<string, string[]> = {};

  for (const svc of services) {
    const mapping = buildVolumeMapping(svc);
    if (mapping) {
      volumes.push(mapping.volumeConfig);
      serviceVolumeMappings[svc.name] = [
        ...(serviceVolumeMappings[svc.name] ?? []),
        mapping.mountPath,
      ];
    }

    if (svc.volumes) {
      serviceVolumeMappings[svc.name] = [
        ...(serviceVolumeMappings[svc.name] ?? []),
        ...svc.volumes,
      ];
    }
  }

  for (const extra of extraVolumes) {
    if (!volumes.some((v) => v.name === extra.name)) {
      volumes.push(extra);
    }
  }

  const frozenVolumes = Object.freeze(volumes);
  const frozenMappings = Object.freeze(
    Object.fromEntries(
      Object.entries(serviceVolumeMappings).map(([k, v]) => [k, Object.freeze(v)]),
    ),
  );

  const log = buildLog(
    SOURCE,
    `Defined ${frozenVolumes.length} volume(s): ${frozenVolumes.map((v) => v.name).join(", ") || "none"}`,
  );

  return {
    nextState: transitionState(state, { volumes: frozenVolumes, appendLog: log }),
    output: Object.freeze({
      success: true,
      compose: "",
      services: Object.freeze([]),
      logs: Object.freeze([log]),
    }),
    volumes: frozenVolumes,
    serviceVolumeMappings: frozenMappings,
  };
}
