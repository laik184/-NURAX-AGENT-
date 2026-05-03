# Agents Folder

Each file is a single-purpose agent called by `../orchestrator.ts`.

- `base-image-selector.agent.ts`: picks a base image.
- `dockerfile-generator.agent.ts`: builds Dockerfile text.
- `compose-generator.agent.ts`: builds docker-compose.yml text.
- `env-injector.agent.ts`: normalizes environment variables.
- `image-optimizer.agent.ts`: optimizes Dockerfile layering format.
- `port-mapper.agent.ts`: maps host/container ports.

No file in this folder imports another agent.
