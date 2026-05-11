export interface TunnelInfo {
  ok: boolean;
  url: string | null;
  domain: string | null;
  port: number;
  isLocal: boolean;
  isReplit: boolean;
  error?: string;
}

export interface PortMapping {
  id: string;
  localPort: number;
  externalPort: number;
  label?: string;
  localAddress: string;
  active: boolean;
  protocol: 'http' | 'https' | 'ws' | 'wss';
}

export interface PortListResult {
  ok: boolean;
  ports: PortMapping[];
  error?: string;
}

export interface AddPortInput {
  localPort: number;
  externalPort: number;
  label?: string;
  protocol?: 'http' | 'https';
}

export interface AddPortResult {
  ok: boolean;
  port?: PortMapping;
  error?: string;
}

export interface RemovePortResult {
  ok: boolean;
  id: string;
  error?: string;
}

export interface TunnelServiceConfig {
  defaultPort: number;
  replitDomain?: string;
  devDomain?: string;
  localFallback: string;
}
