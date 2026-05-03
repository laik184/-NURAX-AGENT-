import type { ServiceRole } from "../types.js";

const ROLE_BUILD_PATHS: Readonly<Record<ServiceRole, string>> = Object.freeze({
  backend: "./backend",
  frontend: "./frontend",
  database: "./db",
  cache: "./cache",
  proxy: "./nginx",
  worker: "./worker",
  generic: ".",
});

const ROLE_VOLUME_PATHS: Readonly<Record<ServiceRole, string | null>> = Object.freeze({
  backend: null,
  frontend: null,
  database: "/var/lib/postgresql/data",
  cache: "/data",
  proxy: "/etc/nginx",
  worker: null,
  generic: null,
});

export function getDefaultBuildPath(role: ServiceRole): string {
  return ROLE_BUILD_PATHS[role];
}

export function getDefaultVolumePath(role: ServiceRole): string | null {
  return ROLE_VOLUME_PATHS[role];
}

export function resolveEnvFilePath(serviceName: string): string {
  return `.env.${serviceName}`;
}

export function resolveBuildContext(buildPath?: string, role?: ServiceRole): string {
  if (buildPath) return buildPath;
  if (role) return getDefaultBuildPath(role);
  return ".";
}
