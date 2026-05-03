import { transitionState } from "../state.js";
import type { AgentResult, DockerComposeState, ServiceConfig, ServiceRole } from "../types.js";
import { buildLog } from "../utils/logger.util.js";

const SOURCE = "dependency-mapper";

const ROLE_DEPENDENCIES: Readonly<Partial<Record<ServiceRole, readonly ServiceRole[]>>> =
  Object.freeze({
    backend: Object.freeze(["database", "cache"]),
    frontend: Object.freeze(["backend"]),
    worker: Object.freeze(["database", "cache"]),
    proxy: Object.freeze(["backend", "frontend"]),
  });

export interface DependencyMapperInput {
  readonly services: readonly ServiceConfig[];
  readonly state: Readonly<DockerComposeState>;
}

export interface DependencyMapperOutput extends AgentResult {
  readonly services: readonly ServiceConfig[];
}

function resolveImplicitDependencies(
  svc: ServiceConfig,
  allServices: readonly ServiceConfig[],
): readonly string[] {
  const explicitDeps = new Set<string>(svc.dependsOn ?? []);
  const implicitRoles = ROLE_DEPENDENCIES[svc.role] ?? [];

  for (const depRole of implicitRoles) {
    const match = allServices.find((s) => s.role === depRole && s.name !== svc.name);
    if (match) explicitDeps.add(match.name);
  }

  return Object.freeze([...explicitDeps]);
}

function detectCycle(
  services: readonly ServiceConfig[],
): string | null {
  const graph = new Map<string, readonly string[]>(
    services.map((s) => [s.name, s.dependsOn ?? []]),
  );

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    inStack.add(node);
    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor) && dfs(neighbor)) return true;
      if (inStack.has(neighbor)) return true;
    }
    inStack.delete(node);
    return false;
  }

  for (const svc of services) {
    if (!visited.has(svc.name) && dfs(svc.name)) {
      return `Circular dependency detected involving "${svc.name}"`;
    }
  }

  return null;
}

export function mapDependencies(input: DependencyMapperInput): Readonly<DependencyMapperOutput> {
  const { services, state } = input;

  const resolved = services.map((svc) =>
    Object.freeze({
      ...svc,
      dependsOn: resolveImplicitDependencies(svc, services),
    }),
  );

  const cycleError = detectCycle(resolved);
  if (cycleError) {
    const log = buildLog(SOURCE, cycleError);
    return {
      nextState: transitionState(state, {
        status: "FAILED",
        appendError: cycleError,
        appendLog: log,
      }),
      output: Object.freeze({
        success: false,
        compose: "",
        services: Object.freeze([]),
        logs: Object.freeze([log]),
        error: "circular_dependency",
      }),
      services: Object.freeze([]),
    };
  }

  const frozen = Object.freeze(resolved);
  const depSummary = frozen
    .filter((s) => (s.dependsOn?.length ?? 0) > 0)
    .map((s) => `${s.name}→[${s.dependsOn!.join(",")}]`)
    .join(" ");

  const log = buildLog(
    SOURCE,
    `Mapped dependencies for ${frozen.length} service(s)${depSummary ? `: ${depSummary}` : " (no deps)"}`,
  );

  return {
    nextState: transitionState(state, { services: frozen, appendLog: log }),
    output: Object.freeze({
      success: true,
      compose: "",
      services: Object.freeze(frozen.map((s) => s.name)),
      logs: Object.freeze([log]),
    }),
    services: frozen,
  };
}
