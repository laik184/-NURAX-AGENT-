import { selectBaseImage } from './agents/base-image-selector.agent.js';
import { generateComposeFile } from './agents/compose-generator.agent.js';
import { generateDockerfile } from './agents/dockerfile-generator.agent.js';
import { injectEnvironmentVariables } from './agents/env-injector.agent.js';
import { optimizeDockerfileLayers } from './agents/image-optimizer.agent.js';
import { mapPorts } from './agents/port-mapper.agent.js';
import { createInitialDockerConfiguratorState, patchDockerConfiguratorState } from './state.js';
import type { DockerConfig, DockerConfiguratorOutput, ProjectType } from './types.js';
import { logMessage } from './utils/logger.util.js';
import { resolveDockerPath } from './utils/path-resolver.util.js';

const detectProjectType = (files: ReadonlyArray<string> = []): ProjectType => {
  if (files.some((file) => file.endsWith('package.json'))) {
    return 'node';
  }

  if (files.some((file) => file.endsWith('requirements.txt') || file.endsWith('pyproject.toml'))) {
    return 'python';
  }

  return 'generic';
};

export const generateDockerConfig = async (
  input: DockerConfig,
): Promise<Readonly<DockerConfiguratorOutput>> => {
  let state = createInitialDockerConfiguratorState();
  state = patchDockerConfiguratorState(state, {
    status: 'BUILDING',
    logs: [...state.logs, logMessage('orchestrator', 'Docker config generation started')],
  });

  try {
    const projectType = detectProjectType(input.files);
    state = patchDockerConfiguratorState(state, {
      projectType,
      logs: [...state.logs, logMessage('orchestrator', `Detected project type: ${projectType}`)],
    });

    const baseImage = selectBaseImage(projectType);
    state = patchDockerConfiguratorState(state, {
      logs: [...state.logs, logMessage('base-image-selector', `Selected base image: ${baseImage}`)],
    });

    const ports = mapPorts(input.targetPort, input.hostPort);
    const envConfig = injectEnvironmentVariables(input.env);
    const dockerfile = generateDockerfile({
      projectType,
      baseImage,
      workdir: input.workdir ?? '/app',
      entrypoint: input.entrypoint ?? 'node server.js',
      env: envConfig,
      exposedPorts: ports.map((port) => port.containerPort),
    });

    state = patchDockerConfiguratorState(state, {
      dockerfile,
      ports: [...ports],
      env: { ...envConfig.variables },
      logs: [...state.logs, logMessage('dockerfile-generator', 'Generated Dockerfile content')],
    });

    const compose = generateComposeFile({
      serviceName: input.serviceName,
      imageName: input.imageName,
      containerName: input.containerName,
      buildContext: input.buildContext ?? '.',
      dockerfilePath: resolveDockerPath('.', input.dockerfilePath ?? 'Dockerfile'),
      env: envConfig,
      ports,
    });

    state = patchDockerConfiguratorState(state, {
      composeFile: compose,
      logs: [...state.logs, logMessage('compose-generator', 'Generated docker-compose.yml content')],
    });

    const optimizedDockerfile = optimizeDockerfileLayers(state.dockerfile);

    state = patchDockerConfiguratorState(state, {
      dockerfile: optimizedDockerfile,
      status: 'SUCCESS',
      logs: [...state.logs, logMessage('image-optimizer', 'Optimized Dockerfile layers')],
    });

    const output: DockerConfiguratorOutput = {
      success: true,
      dockerfile: state.dockerfile,
      compose: state.composeFile,
      logs: state.logs,
    };

    return Object.freeze(output);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate Docker config';
    state = patchDockerConfiguratorState(state, {
      status: 'FAILED',
      errors: [...state.errors, message],
      logs: [...state.logs, logMessage('orchestrator', `Generation failed: ${message}`)],
    });

    const output: DockerConfiguratorOutput = {
      success: false,
      dockerfile: state.dockerfile,
      compose: state.composeFile,
      logs: state.logs,
      error: message,
    };

    return Object.freeze(output);
  }
};

export const validateDockerConfig = (output: DockerConfiguratorOutput): boolean => {
  const hasDockerfile = output.dockerfile.includes('FROM ');
  const hasCompose = output.compose.includes('services:');
  return output.success && hasDockerfile && hasCompose;
};
