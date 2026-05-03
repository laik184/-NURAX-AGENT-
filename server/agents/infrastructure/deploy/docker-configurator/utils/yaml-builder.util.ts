import type { EnvConfig, PortMapping } from '../types.js';

const formatPorts = (ports: ReadonlyArray<PortMapping>): string => {
  if (ports.length === 0) {
    return '[]';
  }

  return `\n${ports
    .map((port) => `      - \"${port.hostPort}:${port.containerPort}${port.protocol ? `/${port.protocol}` : ''}\"`)
    .join('\n')}`;
};

const formatEnvironment = (env: EnvConfig): string => {
  const keys = Object.keys(env.variables);
  if (keys.length === 0) {
    return '      {}';
  }

  return `\n${keys.map((key) => `      ${key}: ${JSON.stringify(env.variables[key])}`).join('\n')}`;
};

export const buildComposeYaml = (options: {
  serviceName: string;
  imageName: string;
  containerName: string;
  buildContext: string;
  dockerfilePath: string;
  ports: ReadonlyArray<PortMapping>;
  env: EnvConfig;
}): string => `version: '3.9'
services:
  ${options.serviceName}:
    image: ${options.imageName}
    container_name: ${options.containerName}
    build:
      context: ${options.buildContext}
      dockerfile: ${options.dockerfilePath}
    restart: unless-stopped
    environment:${formatEnvironment(options.env)}
    ports:${formatPorts(options.ports)}
`;
