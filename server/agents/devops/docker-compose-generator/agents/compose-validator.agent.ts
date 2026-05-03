import { transitionState } from "../state.js";
import type { AgentResult, ComposeFile, DockerComposeState } from "../types.js";
import { buildError, buildLog } from "../utils/logger.util.js";
import { detectPortConflicts } from "../utils/port-mapper.util.js";

const SOURCE = "compose-validator";

export interface ComposeValidatorInput {
  readonly file: ComposeFile;
  readonly state: Readonly<DockerComposeState>;
}

interface ValidationError {
  readonly field: string;
  readonly message: string;
}

function collectErrors(file: ComposeFile): readonly ValidationError[] {
  const errors: ValidationError[] = [];

  if (file.services.length === 0) {
    errors.push({ field: "services", message: "At least one service must be defined" });
  }

  for (const svc of file.services) {
    if (!svc.name || svc.name.trim() === "") {
      errors.push({ field: `services[?].name`, message: "Service name must not be empty" });
    }
    if (!svc.image && !svc.build) {
      errors.push({
        field: `services.${svc.name}`,
        message: "Service must declare either `image` or `build`",
      });
    }

    for (const dep of svc.dependsOn ?? []) {
      const depExists = file.services.some((s) => s.name === dep);
      if (!depExists) {
        errors.push({
          field: `services.${svc.name}.depends_on`,
          message: `Dependency "${dep}" does not reference a declared service`,
        });
      }
    }

    for (const net of svc.networks ?? []) {
      const netExists = file.networks.some((n) => n.name === net);
      if (!netExists) {
        errors.push({
          field: `services.${svc.name}.networks`,
          message: `Network "${net}" is not declared in the networks section`,
        });
      }
    }
  }

  const portConflicts = detectPortConflicts(file.services);
  for (const conflict of portConflicts) {
    errors.push({ field: "ports", message: conflict });
  }

  for (const net of file.networks) {
    if (!net.name || net.name.trim() === "") {
      errors.push({ field: "networks[?].name", message: "Network name must not be empty" });
    }
  }

  return Object.freeze(errors);
}

export function validateCompose(input: ComposeValidatorInput): Readonly<AgentResult> {
  const { file, state } = input;
  const errors = collectErrors(file);

  if (errors.length > 0) {
    const summary = errors.map((e) => `[${e.field}] ${e.message}`).join("; ");
    const msg = `Validation failed with ${errors.length} error(s): ${summary}`;
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
        error: "validation_failed",
      }),
    };
  }

  const log = buildLog(
    SOURCE,
    `Validation passed — ${file.services.length} service(s), ${file.networks.length} network(s), ${file.volumes.length} volume(s)`,
  );

  return {
    nextState: transitionState(state, { status: "SUCCESS", appendLog: log }),
    output: Object.freeze({
      success: true,
      compose: "",
      services: Object.freeze(file.services.map((s) => s.name)),
      logs: Object.freeze([log]),
    }),
  };
}
