export type ProjectType = 'node' | 'python' | 'generic';

export interface PortMapping {
  containerPort: number;
  hostPort: number;
  protocol?: 'tcp' | 'udp';
}

export interface EnvConfig {
  variables: Readonly<Record<string, string>>;
}

export interface DockerfileConfig {
  projectType: ProjectType;
  baseImage: string;
  workdir: string;
  entrypoint: string;
  env: EnvConfig;
  exposedPorts: ReadonlyArray<number>;
}

export interface ComposeConfig {
  serviceName: string;
  imageName: string;
  containerName: string;
  buildContext: string;
  dockerfilePath: string;
  env: EnvConfig;
  ports: ReadonlyArray<PortMapping>;
}

export interface DockerConfig {
  projectType: ProjectType;
  serviceName: string;
  imageName: string;
  containerName: string;
  targetPort?: number;
  hostPort?: number;
  entrypoint?: string;
  workdir?: string;
  buildContext?: string;
  dockerfilePath?: string;
  env?: Readonly<Record<string, string>>;
  files?: ReadonlyArray<string>;
}

export interface DockerConfiguratorState {
  projectType: string;
  dockerfile: string;
  composeFile: string;
  ports: PortMapping[];
  env: Record<string, string>;
  status: 'IDLE' | 'BUILDING' | 'SUCCESS' | 'FAILED';
  logs: string[];
  errors: string[];
}

export interface DockerConfiguratorOutput {
  success: boolean;
  dockerfile: string;
  compose: string;
  logs: string[];
  error?: string;
}
