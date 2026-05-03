import type { ComposeConfig } from '../types.js';
import { buildComposeYaml } from '../utils/yaml-builder.util.js';

export const generateComposeFile = (config: ComposeConfig): string =>
  buildComposeYaml({
    serviceName: config.serviceName,
    imageName: config.imageName,
    containerName: config.containerName,
    buildContext: config.buildContext,
    dockerfilePath: config.dockerfilePath,
    ports: config.ports,
    env: config.env,
  });
