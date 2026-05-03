import { inferDomainContext }      from "./agents/domain-context.agent.js";
import { inferEnvironmentContext } from "./agents/environment-context.agent.js";
import { inferFrameworkContext }   from "./agents/framework-context.agent.js";
import { classifyProject }         from "./agents/project-classifier.agent.js";
import type { BackendContext, BackendSignalInput } from "./types.js";
import { normalizeSignals }        from "./utils/normalization.util.js";

export function buildBackendContext(input: BackendSignalInput): BackendContext {
  const normalized  = normalizeSignals(input);

  const project     = classifyProject(normalized);
  const framework   = inferFrameworkContext(normalized);
  const domain      = inferDomainContext(normalized);
  const environment = inferEnvironmentContext(normalized, framework);

  return Object.freeze({ project, framework, domain, environment });
}
