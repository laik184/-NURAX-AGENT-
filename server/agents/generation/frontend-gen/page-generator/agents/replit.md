# Agents Folder

Each agent file has exactly one responsibility and is called only by `../orchestrator.ts`.

- `layout-builder.agent.ts`: generates page layout blocks.
- `component-composer.agent.ts`: creates reusable component files.
- `data-binding.agent.ts`: binds layout into framework page templates.
- `api-integration.agent.ts`: wires API call scaffolding.
- `state-integrator.agent.ts`: emits page state setup file.
- `routing-integrator.agent.ts`: registers route artifacts.
- `seo-meta.agent.ts`: creates SEO/title metadata artifacts.

Import rule: agents import from `../types` and `../utils/*` only.
