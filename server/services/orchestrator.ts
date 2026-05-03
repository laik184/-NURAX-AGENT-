import {
  fileSystemService,
  FileSystemSafetyError,
  httpService,
  HttpSafetyError,
  secretsService,
} from "./index.ts";
import type {
  FileSystemService,
  HttpService,
  HttpRequestOptions,
  HttpResponse,
  SecretsService,
  RedactedEnv,
} from "./index.ts";
import { fail, ok, type PlatformServiceInput, type PlatformServiceResult } from "../orchestrator.types.ts";

const SERVICE = "runtime-services";

export {
  fileSystemService,
  FileSystemSafetyError,
  httpService,
  HttpSafetyError,
  secretsService,
};
export type { FileSystemService, HttpService, HttpRequestOptions, HttpResponse, SecretsService, RedactedEnv };

const SERVICES: ReadonlyArray<{ readonly name: string; readonly description: string }> = Object.freeze([
  { name: "filesystem", description: "Sandbox-aware file ops" },
  { name: "http", description: "Allow-listed outbound HTTP" },
  { name: "secrets", description: "Redacted environment access" },
  { name: "git", description: "git init/commit/status/log via system binary" },
  { name: "package-manager", description: "npm install/uninstall/run with line streaming" },
  { name: "project-runner", description: "Per-project child process + port allocator" },
  { name: "shell.spawn", description: "Allow-listed binary spawner" },
]);

export async function runRuntimeServicesOperation(
  input: PlatformServiceInput,
): Promise<PlatformServiceResult> {
  const op = input.operation;
  try {
    switch (op) {
      case "list":
        return ok(SERVICE, op, { count: SERVICES.length, services: SERVICES });
      case "secrets-list":
        return ok(SERVICE, op, secretsService.list());
      default:
        return fail(SERVICE, op, `unknown operation: ${op}`);
    }
  } catch (err) {
    return fail(SERVICE, op, err instanceof Error ? err.message : String(err));
  }
}
