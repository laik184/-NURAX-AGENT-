import type {
  TunnelInfo, PortMapping, PortListResult, AddPortInput,
  AddPortResult, RemovePortResult, TunnelServiceConfig,
} from './tunnel.types.ts';
import { v4 as uuid } from 'uuid';

const DEFAULT_CONFIG: TunnelServiceConfig = {
  defaultPort: 5000,
  replitDomain: process.env.REPLIT_DEV_DOMAIN,
  devDomain: process.env.REPLIT_DOMAINS?.split(',')[0],
  localFallback: 'localhost',
};

export class TunnelService {
  private ports = new Map<string, PortMapping>();
  private config: TunnelServiceConfig;

  constructor(config?: Partial<TunnelServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.seedDefaultPorts();
  }

  getTunnelInfo(): TunnelInfo {
    const domain = this.resolveDomain();
    const isReplit = this.isReplitEnvironment();
    const isLocal = !isReplit;

    if (!domain) {
      return {
        ok: true,
        url: `http://localhost:${this.config.defaultPort}`,
        domain: null,
        port: this.config.defaultPort,
        isLocal: true,
        isReplit: false,
      };
    }

    const url = isReplit ? `https://${domain}` : `http://${domain}:${this.config.defaultPort}`;

    return {
      ok: true,
      url,
      domain,
      port: this.config.defaultPort,
      isLocal,
      isReplit,
    };
  }

  listPorts(): PortListResult {
    return {
      ok: true,
      ports: Array.from(this.ports.values()),
    };
  }

  addPort(input: AddPortInput): AddPortResult {
    const existing = Array.from(this.ports.values()).find(
      p => p.localPort === input.localPort && p.externalPort === input.externalPort
    );
    if (existing) {
      return { ok: false, error: `Port mapping ${input.localPort}→${input.externalPort} already exists` };
    }

    const port: PortMapping = {
      id: uuid(),
      localPort: input.localPort,
      externalPort: input.externalPort,
      label: input.label,
      localAddress: '0.0.0.0',
      active: true,
      protocol: input.protocol ?? 'http',
    };

    this.ports.set(port.id, port);
    return { ok: true, port };
  }

  removePort(id: string): RemovePortResult {
    if (!this.ports.has(id)) {
      return { ok: false, id, error: `Port mapping not found: ${id}` };
    }
    this.ports.delete(id);
    return { ok: true, id };
  }

  getPublicUrl(): string | null {
    const info = this.getTunnelInfo();
    return info.url;
  }

  getActivePorts(): PortMapping[] {
    return Array.from(this.ports.values()).filter(p => p.active);
  }

  private resolveDomain(): string | null {
    if (this.config.devDomain) return this.config.devDomain;
    if (this.config.replitDomain) return this.config.replitDomain;
    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) return replitDomains.split(',')[0].trim();
    return null;
  }

  private isReplitEnvironment(): boolean {
    return !!(process.env.REPL_ID || process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN);
  }

  private seedDefaultPorts(): void {
    this.ports.set('default-5000', {
      id: 'default-5000',
      localPort: 5000,
      externalPort: 80,
      label: 'web',
      localAddress: '0.0.0.0',
      active: true,
      protocol: 'http',
    });
    this.ports.set('default-3001', {
      id: 'default-3001',
      localPort: 3001,
      externalPort: 3002,
      label: 'api',
      localAddress: '0.0.0.0',
      active: true,
      protocol: 'http',
    });
  }
}

export const tunnelService = new TunnelService();
