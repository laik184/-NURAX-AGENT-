import type { ComposeFile, HealthCheck, NetworkConfig, ServiceConfig, VolumeConfig } from "../types.js";
import { formatPortMappings } from "./port-mapper.util.js";

const COMPOSE_VERSION = "3.9";

function ind(level: number): string {
  return "  ".repeat(level);
}

function yamlStr(value: string): string {
  const needsQuotes =
    /[:#\[\]{},|>&*!'"?%@`]/.test(value) ||
    value.trim() === "" ||
    /^\d+$/.test(value) ||
    value === "true" ||
    value === "false";
  return needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
}

function serializeHealthCheck(hc: HealthCheck, level: number): string {
  const lines: string[] = [`${ind(level)}healthcheck:`];
  lines.push(`${ind(level + 1)}test: ${yamlStr(hc.test)}`);
  if (hc.interval) lines.push(`${ind(level + 1)}interval: ${hc.interval}`);
  if (hc.timeout) lines.push(`${ind(level + 1)}timeout: ${hc.timeout}`);
  if (hc.retries !== undefined) lines.push(`${ind(level + 1)}retries: ${hc.retries}`);
  if (hc.startPeriod) lines.push(`${ind(level + 1)}start_period: ${hc.startPeriod}`);
  return lines.join("\n");
}

function serializeService(svc: ServiceConfig): string {
  const lines: string[] = [`${ind(1)}${svc.name}:`];

  if (svc.image) lines.push(`${ind(2)}image: ${yamlStr(svc.image)}`);

  if (svc.build) {
    lines.push(`${ind(2)}build:`);
    lines.push(`${ind(3)}context: ${svc.build}`);
  }

  if (svc.command) lines.push(`${ind(2)}command: ${yamlStr(svc.command)}`);

  if (svc.restart) lines.push(`${ind(2)}restart: ${svc.restart}`);

  if (svc.memLimit) lines.push(`${ind(2)}mem_limit: ${svc.memLimit}`);
  if (svc.cpuShares) lines.push(`${ind(2)}cpu_shares: ${svc.cpuShares}`);

  const ports = svc.ports && svc.ports.length > 0 ? formatPortMappings(svc.ports) : [];
  if (ports.length > 0) {
    lines.push(`${ind(2)}ports:`);
    for (const p of ports) lines.push(`${ind(3)}- ${yamlStr(p)}`);
  }

  if (svc.volumes && svc.volumes.length > 0) {
    lines.push(`${ind(2)}volumes:`);
    for (const v of svc.volumes) lines.push(`${ind(3)}- ${v}`);
  }

  if (svc.networks && svc.networks.length > 0) {
    lines.push(`${ind(2)}networks:`);
    for (const n of svc.networks) lines.push(`${ind(3)}- ${n}`);
  }

  if (svc.dependsOn && svc.dependsOn.length > 0) {
    lines.push(`${ind(2)}depends_on:`);
    for (const d of svc.dependsOn) lines.push(`${ind(3)}- ${d}`);
  }

  if (svc.environment && Object.keys(svc.environment).length > 0) {
    lines.push(`${ind(2)}environment:`);
    for (const [k, v] of Object.entries(svc.environment)) {
      lines.push(`${ind(3)}${k}: ${yamlStr(v)}`);
    }
  }

  if (svc.envFile) lines.push(`${ind(2)}env_file:\n${ind(3)}- ${svc.envFile}`);

  if (svc.labels && Object.keys(svc.labels).length > 0) {
    lines.push(`${ind(2)}labels:`);
    for (const [k, v] of Object.entries(svc.labels)) {
      lines.push(`${ind(3)}${k}: ${yamlStr(v)}`);
    }
  }

  if (svc.healthCheck) {
    lines.push(serializeHealthCheck(svc.healthCheck, 2));
  }

  return lines.join("\n");
}

function serializeNetworks(networks: readonly NetworkConfig[]): string {
  if (networks.length === 0) return "";
  const lines: string[] = ["networks:"];
  for (const net of networks) {
    lines.push(`${ind(1)}${net.name}:`);
    lines.push(`${ind(2)}driver: ${net.driver}`);
    if (net.external) lines.push(`${ind(2)}external: true`);
    if (net.labels && Object.keys(net.labels).length > 0) {
      lines.push(`${ind(2)}labels:`);
      for (const [k, v] of Object.entries(net.labels)) {
        lines.push(`${ind(3)}${k}: ${yamlStr(v)}`);
      }
    }
  }
  return lines.join("\n");
}

function serializeVolumes(volumes: readonly VolumeConfig[]): string {
  const named = volumes.filter((v) => v.type === "named");
  if (named.length === 0) return "";
  const lines: string[] = ["volumes:"];
  for (const vol of named) {
    lines.push(`${ind(1)}${vol.name}:`);
    if (vol.external) lines.push(`${ind(2)}external: true`);
    if (vol.labels && Object.keys(vol.labels).length > 0) {
      lines.push(`${ind(2)}labels:`);
      for (const [k, v] of Object.entries(vol.labels)) {
        lines.push(`${ind(3)}${k}: ${yamlStr(v)}`);
      }
    }
  }
  return lines.join("\n");
}

export function buildComposeYaml(file: ComposeFile): string {
  const sections: string[] = [];

  sections.push(`version: "${file.version ?? COMPOSE_VERSION}"`);
  sections.push("");

  if (file.services.length > 0) {
    sections.push("services:");
    for (const svc of file.services) {
      sections.push(serializeService(svc));
    }
  }

  const networksYaml = serializeNetworks(file.networks);
  if (networksYaml) {
    sections.push("");
    sections.push(networksYaml);
  }

  const volumesYaml = serializeVolumes(file.volumes);
  if (volumesYaml) {
    sections.push("");
    sections.push(volumesYaml);
  }

  return sections.join("\n").trimEnd() + "\n";
}

export function getComposeVersion(): string {
  return COMPOSE_VERSION;
}
