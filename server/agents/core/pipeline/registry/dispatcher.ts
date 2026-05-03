import { ORCHESTRATOR_REGISTRY, findByCapability, findById, getRegistryStats } from './orchestrator.registry.ts';
import type { OrchestratorEntry, OrchestratorDomain } from './orchestrator.registry.ts';

export interface DispatchRequest {
  readonly capabilities: readonly string[];
  readonly input: unknown;
  readonly maxOrchestrators?: number;
  readonly domainFilter?: readonly OrchestratorDomain[];
}

export interface DispatchedResult {
  readonly orchestratorId: string;
  readonly domain: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly durationMs: number;
}

export interface DispatchSummary {
  readonly totalDispatched: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly DispatchedResult[];
  readonly logs: readonly string[];
}

async function runOne(entry: OrchestratorEntry, input: unknown): Promise<DispatchedResult> {
  const start = Date.now();
  try {
    const data = await entry.run(input);
    return Object.freeze({
      orchestratorId: entry.id,
      domain: entry.domain,
      success: true,
      data,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    return Object.freeze({
      orchestratorId: entry.id,
      domain: entry.domain,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    });
  }
}

export async function dispatch(req: DispatchRequest): Promise<DispatchSummary> {
  const logs: string[] = [];
  const MAX = req.maxOrchestrators ?? 5;

  // Find matching orchestrators by capability
  const matched = new Map<string, OrchestratorEntry>();
  for (const cap of req.capabilities) {
    for (const entry of findByCapability(cap)) {
      if (!matched.has(entry.id)) {
        if (!req.domainFilter || req.domainFilter.includes(entry.domain)) {
          matched.set(entry.id, entry);
        }
      }
    }
  }

  const selected = [...matched.values()].slice(0, MAX);
  logs.push(`[dispatcher] capabilities=[${req.capabilities.join(',')}] matched=${matched.size} running=${selected.length}`);

  if (selected.length === 0) {
    logs.push('[dispatcher] no orchestrators matched — request handled by pipeline default');
    return Object.freeze({ totalDispatched: 0, succeeded: 0, failed: 0, results: Object.freeze([]), logs: Object.freeze(logs) });
  }

  // Run all matched orchestrators in parallel
  const results = await Promise.all(selected.map((e) => runOne(e, req.input)));

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;
  results.forEach((r) => logs.push(`[dispatcher] ${r.success ? '✅' : '❌'} ${r.orchestratorId} (${r.durationMs}ms)${r.error ? ' err=' + r.error.slice(0, 60) : ''}`));

  return Object.freeze({
    totalDispatched: results.length,
    succeeded,
    failed,
    results: Object.freeze(results),
    logs: Object.freeze(logs),
  });
}

export async function dispatchById(ids: readonly string[], input: unknown): Promise<DispatchSummary> {
  const logs: string[] = [`[dispatcher] dispatchById ids=[${ids.join(',')}]`];
  const entries = ids.map((id) => findById(id)).filter(Boolean) as OrchestratorEntry[];

  if (entries.length === 0) {
    logs.push('[dispatcher] no orchestrators found for given IDs');
    return Object.freeze({ totalDispatched: 0, succeeded: 0, failed: 0, results: Object.freeze([]), logs: Object.freeze(logs) });
  }

  const results = await Promise.all(entries.map((e) => runOne(e, input)));
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;
  results.forEach((r) => logs.push(`[dispatcher] ${r.success ? '✅' : '❌'} ${r.orchestratorId} (${r.durationMs}ms)`));

  return Object.freeze({
    totalDispatched: results.length,
    succeeded,
    failed,
    results: Object.freeze(results),
    logs: Object.freeze(logs),
  });
}

export { getRegistryStats, ORCHESTRATOR_REGISTRY };
