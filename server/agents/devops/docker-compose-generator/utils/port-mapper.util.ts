import type { PortMapping, ServiceRole } from "../types.js";

const ROLE_DEFAULT_PORTS: Readonly<Record<ServiceRole, PortMapping[]>> = Object.freeze({
  backend: [Object.freeze({ host: 3000, container: 3000, protocol: "tcp" as const })],
  frontend: [Object.freeze({ host: 80, container: 80, protocol: "tcp" as const })],
  database: [Object.freeze({ host: 5432, container: 5432, protocol: "tcp" as const })],
  cache: [Object.freeze({ host: 6379, container: 6379, protocol: "tcp" as const })],
  proxy: [
    Object.freeze({ host: 80, container: 80, protocol: "tcp" as const }),
    Object.freeze({ host: 443, container: 443, protocol: "tcp" as const }),
  ],
  worker: [],
  generic: [],
});

export function getDefaultPorts(role: ServiceRole): readonly PortMapping[] {
  return ROLE_DEFAULT_PORTS[role];
}

export function formatPortMapping(port: PortMapping): string {
  const proto = port.protocol && port.protocol !== "tcp" ? `/${port.protocol}` : "";
  return `${port.host}:${port.container}${proto}`;
}

export function formatPortMappings(ports: readonly PortMapping[]): readonly string[] {
  return Object.freeze(ports.map(formatPortMapping));
}

export function detectPortConflicts(
  services: ReadonlyArray<{ ports?: readonly PortMapping[] }>,
): readonly string[] {
  const seen = new Map<number, string[]>();
  const conflicts: string[] = [];

  services.forEach((svc, i) => {
    for (const port of svc.ports ?? []) {
      const existing = seen.get(port.host) ?? [];
      if (existing.length > 0) {
        conflicts.push(`Host port ${port.host} is mapped by multiple services (indices: ${[...existing, String(i)].join(", ")})`);
      }
      seen.set(port.host, [...existing, String(i)]);
    }
  });

  return Object.freeze(conflicts);
}
