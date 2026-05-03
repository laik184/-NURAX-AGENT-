import type { DockerfileConfig } from '../types.js';
import { joinTemplateSections } from '../utils/template-builder.util.js';

export const generateDockerfile = (config: DockerfileConfig): string => {
  const envKeys = Object.keys(config.env.variables);

  const envSection =
    envKeys.length === 0
      ? ''
      : envKeys.map((key) => `ENV ${key}=${JSON.stringify(config.env.variables[key])}`).join('\n');

  const exposedPortsSection = config.exposedPorts.map((port) => `EXPOSE ${port}`).join('\n');

  return joinTemplateSections([
    `FROM ${config.baseImage}`,
    `WORKDIR ${config.workdir}`,
    'COPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .',
    envSection,
    exposedPortsSection,
    `CMD [${JSON.stringify(config.entrypoint)}]`,
  ]);
};
