export type ComposeStatus = "IDLE" | "BUILDING" | "SUCCESS" | "FAILED";

export type NetworkDriver = "bridge" | "host" | "overlay" | "none";

export type VolumeType = "named" | "bind" | "tmpfs";

export type RestartPolicy = "no" | "always" | "on-failure" | "unless-stopped";

export type ServiceRole = "backend" | "frontend" | "database" | "cache" | "proxy" | "worker" | "generic";

export interface PortMapping {
  readonly host: number;
  readonly container: number;
  readonly protocol?: "tcp" | "udp";
}

export interface HealthCheck {
  readonly test: string;
  readonly interval?: string;
  readonly timeout?: string;
  readonly retries?: number;
  readonly startPeriod?: string;
}

export interface ServiceConfig {
  readonly name: string;
  readonly role: ServiceRole;
  readonly image?: string;
  readonly build?: string;
  readonly ports?: readonly PortMapping[];
  readonly environment?: Readonly<Record<string, string>>;
  readonly envFile?: string;
  readonly volumes?: readonly string[];
  readonly networks?: readonly string[];
  readonly dependsOn?: readonly string[];
  readonly command?: string;
  readonly restart?: RestartPolicy;
  readonly healthCheck?: HealthCheck;
  readonly labels?: Readonly<Record<string, string>>;
  readonly memLimit?: string;
  readonly cpuShares?: number;
}

export interface NetworkConfig {
  readonly name: string;
  readonly driver: NetworkDriver;
  readonly external?: boolean;
  readonly labels?: Readonly<Record<string, string>>;
}

export interface VolumeConfig {
  readonly name: string;
  readonly type: VolumeType;
  readonly source?: string;
  readonly external?: boolean;
  readonly labels?: Readonly<Record<string, string>>;
}

export interface ComposeFile {
  readonly version: string;
  readonly services: readonly ServiceConfig[];
  readonly networks: readonly NetworkConfig[];
  readonly volumes: readonly VolumeConfig[];
}

export interface ComposeResult {
  readonly success: boolean;
  readonly compose: string;
  readonly services: readonly string[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface DockerComposeState {
  readonly services: readonly ServiceConfig[];
  readonly networks: readonly NetworkConfig[];
  readonly volumes: readonly VolumeConfig[];
  readonly env: Readonly<Record<string, string>>;
  readonly status: ComposeStatus;
  readonly logs: readonly string[];
  readonly errors: readonly string[];
}

export interface StatePatch {
  readonly services?: readonly ServiceConfig[];
  readonly networks?: readonly NetworkConfig[];
  readonly volumes?: readonly VolumeConfig[];
  readonly env?: Readonly<Record<string, string>>;
  readonly status?: ComposeStatus;
  readonly appendLog?: string;
  readonly appendError?: string;
}

export interface AgentResult {
  readonly nextState: Readonly<DockerComposeState>;
  readonly output: Readonly<ComposeResult>;
}
