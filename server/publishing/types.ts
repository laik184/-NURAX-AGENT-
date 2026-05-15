export type DeployStepId =
  | "provision"
  | "security-scan"
  | "build"
  | "bundle"
  | "promote";

export type DeployStepStatus = "idle" | "running" | "done" | "failed";

export interface DeployStep {
  id: DeployStepId;
  label: string;
  status: DeployStepStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export type DeploymentStatus =
  | "idle"
  | "building"
  | "live"
  | "failed"
  | "stopped";

export type AppRuntimeStatus =
  | "running"
  | "stopped"
  | "error"
  | "restarting";

export type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface DeployLogEntry {
  id: number;
  deploymentId: number;
  ts: string;
  level: LogLevel;
  message: string;
}

export type DomainStatus = "pending" | "verifying" | "connected" | "error";

export interface DomainEntry {
  id: number;
  projectId: number;
  name: string;
  status: DomainStatus;
  addedAt: number;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

export type IssueSeverity = "critical" | "medium" | "low";
export type IssueState = "active" | "hidden" | "fixed";

export interface SecurityIssue {
  id: string;
  deploymentId: number;
  severity: IssueSeverity;
  title: string;
  desc: string;
  state: IssueState;
}

export type ScanStatus = "idle" | "scanning" | "done";

export interface SecurityScanResult {
  deploymentId: number;
  status: ScanStatus;
  progress: number;
  issues: SecurityIssue[];
  completedAt?: number;
}

export interface MetricPoint {
  time: string;
  cpu: number;
  mem: number;
}

export type MetricRange = "5m" | "1h" | "24h";

export interface AppSettings {
  projectId: number;
  appName: string;
  environment: "production" | "development" | "staging";
  region: string;
  isPublic: boolean;
  dbUrl?: string;
}

export type AuthProvider = "email" | "google" | "github" | "discord";

export interface ProviderConfig {
  id: AuthProvider;
  enabled: boolean;
}

export interface AuthConfig {
  projectId: number;
  providers: ProviderConfig[];
  requireEmailVerif: boolean;
  sessionExpiry: "1d" | "7d" | "30d" | "never";
}

export interface AppSecret {
  id: number;
  projectId: number;
  key: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSecretWithValue extends AppSecret {
  value: string;
}

export interface DeploymentRecord {
  id: number;
  projectId: number;
  status: DeploymentStatus;
  url: string | null;
  region: string;
  environment: string;
  steps: DeployStep[];
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

export interface RuntimeStatus {
  appStatus: AppRuntimeStatus;
  uptime: number;
  lastDeployed: number | null;
  cpuPct: number;
  memMb: number;
}
