import { runPersistenceOperation } from "../infrastructure/db/orchestrator.ts";
import { runEventBusOperation } from "../infrastructure/events/orchestrator.ts";
import { runLlmOperation } from "../llm/orchestrator.ts";
import { runPreviewProxyOperation } from "../infrastructure/proxy/orchestrator.ts";
import { runHttpRoutesOperation } from "../api/orchestrator.ts";
import { runSandboxOperation } from "../infrastructure/sandbox/orchestrator.ts";
import { runRuntimeServicesOperation } from "../services/orchestrator.ts";
import { runStreamsOperation } from "../streams/orchestrator.ts";
import { runToolsOperation } from "../tools/orchestrator.ts";
import { fail, type PlatformServiceInput, type PlatformServiceResult } from "./orchestrator.types.ts";

const SERVICE = "platform-services";

const RUNNERS: Readonly<Record<string, (i: PlatformServiceInput) => Promise<PlatformServiceResult>>> =
  Object.freeze({
    persistence: runPersistenceOperation,
    "event-bus": runEventBusOperation,
    "llm-client": runLlmOperation,
    "preview-proxy": runPreviewProxyOperation,
    "http-routes": runHttpRoutesOperation,
    sandbox: runSandboxOperation,
    "runtime-services": runRuntimeServicesOperation,
    streams: runStreamsOperation,
    tools: runToolsOperation,
  });

export interface PlatformDispatchInput extends PlatformServiceInput {
  readonly service: string;
}

export async function runPlatformService(
  input: PlatformDispatchInput,
): Promise<PlatformServiceResult> {
  const runner = RUNNERS[input.service];
  if (!runner) return fail(SERVICE, input.operation, `unknown service: ${input.service}`);
  return runner(input);
}

export function listPlatformServices(): readonly string[] {
  return Object.freeze(Object.keys(RUNNERS));
}

export {
  runPersistenceOperation,
  runEventBusOperation,
  runLlmOperation,
  runPreviewProxyOperation,
  runHttpRoutesOperation,
  runSandboxOperation,
  runRuntimeServicesOperation,
  runStreamsOperation,
  runToolsOperation,
};
