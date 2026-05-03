# Docker Configurator (HVP)

## 1) Module Purpose
The `docker-configurator` module generates production-ready Docker configuration files (`Dockerfile` and `docker-compose.yml`) without running containers or performing runtime orchestration.

## 2) File Responsibilities
- `orchestrator.ts` (L1): executes the generation flow and is the only state-mutating layer.
- `agents/*.agent.ts` (L2): each agent handles exactly one responsibility.
- `utils/*.util.ts` (L3): helper-only functions (formatting, path handling, yaml/template building, logging).
- `types.ts` (L0): contracts for inputs, outputs, and configs.
- `state.ts` (L0): immutable runtime state factory and patching utility.
- `index.ts`: public exports.

## 3) Flow Diagram
1. detect project type  
2. select base image  
3. generate Dockerfile  
4. inject env variables  
5. generate docker-compose.yml  
6. optimize image layers  
7. return frozen output

Flow:
`orchestrator -> base-image-selector -> dockerfile-generator -> env-injector -> compose-generator -> image-optimizer`

## 4) Import Relationships
- L1 imports only L2/L3/L0.
- L2 imports only L3/L0.
- L3 imports only local helpers or Node built-ins.
- No agent-to-agent imports.
- No upward imports.

## 5) Example Output
```ts
{
  success: true,
  dockerfile: 'FROM node:18-alpine\nWORKDIR /app\n...\n',
  compose: "version: '3.9'\nservices:\n  api:\n...",
  logs: ['[docker-configurator:orchestrator] Docker config generation started']
}
```
