import {
  ORCHESTRATOR_REGISTRY,
  findByCapability,
  findById,
  getRegistryStats,
  FORBIDDEN_DISPATCH_IDS,
  FORBIDDEN_DISPATCH_DOMAINS,
} from './orchestrator.registry.ts';
import type { OrchestratorEntry, OrchestratorDomain } from './orchestrator.registry.ts';

// ─── WORKER-ONLY DOMAIN ALLOWLIST ─────────────────────────────────────────────
// Only these domains may be targeted by the worker dispatcher.
// 'core-support' is absent: it contains phase orchestrators that executePipeline
//   already calls directly — re-dispatching them corrupts shared pipeline state.
// 'platform-services' is absent: orchestration-layer infrastructure (http-routes,
//   streams, tools, event-bus) are forbidden worker units.
export const WORKER_DISPATCH_DOMAINS: ReadonlySet<OrchestratorDomain> = new Set<OrchestratorDomain>([
  'generation',
  'intelligence',
  'security',
  'observability',
  'devops',
  'infrastructure',
  'data',
  'realtime',
]);

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

// ─── CYCLE DETECTION ──────────────────────────────────────────────────────────
// Tracks IDs currently executing within a single dispatch() call to prevent
// self-dispatch and same-round cycle chains.
const _activeDispatch = new Set<string>();

function assertNotForbiddenEntry(entry: OrchestratorEntry): void {
  if (FORBIDDEN_DISPATCH_IDS.has(entry.id)) {
    throw new Error(
      `[dispatcher] FORBIDDEN: "${entry.id}" is an orchestration-layer component ` +
      `and cannot be dispatched as a worker.`,
    );
  }
  if (FORBIDDEN_DISPATCH_DOMAINS.has(entry.domain) || !WORKER_DISPATCH_DOMAINS.has(entry.domain)) {
    throw new Error(
      `[dispatcher] BLOCKED: domain "${entry.domain}" is not in the worker domain allowlist. ` +
      `Entry "${entry.id}" cannot be dispatched. ` +
      `Allowed domains: ${[...WORKER_DISPATCH_DOMAINS].join(', ')}.`,
    );
  }
}

async function runOne(entry: OrchestratorEntry, input: unknown): Promise<DispatchedResult> {
  const start = Date.now();

  // ── Cycle detection: prevent the same ID from running twice in one dispatch round
  if (_activeDispatch.has(entry.id)) {
    return Object.freeze({
      orchestratorId: entry.id,
      domain: entry.domain,
      success: false,
      error: `[dispatcher] Cycle detected: "${entry.id}" is already executing in this dispatch round.`,
      durationMs: 0,
    });
  }

  _activeDispatch.add(entry.id);
  try {
    assertNotForbiddenEntry(entry);
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
  } finally {
    _activeDispatch.delete(entry.id);
  }
}

export async function dispatch(req: DispatchRequest): Promise<DispatchSummary> {
  const logs: string[] = [];
  const MAX = req.maxOrchestrators ?? 5;

  // Build the effective domain allowlist: WORKER_DISPATCH_DOMAINS intersected
  // with caller's domainFilter (caller may further restrict, never expand).
  const effectiveDomains: Set<OrchestratorDomain> = req.domainFilter
    ? new Set(req.domainFilter.filter((d) => WORKER_DISPATCH_DOMAINS.has(d)) as OrchestratorDomain[])
    : new Set(WORKER_DISPATCH_DOMAINS);

  if (effectiveDomains.size === 0) {
    logs.push('[dispatcher] domain filter produced empty allowlist — no dispatch');
    return Object.freeze({ totalDispatched: 0, succeeded: 0, failed: 0, results: Object.freeze([]), logs: Object.freeze(logs) });
  }

  // Find matching orchestrators by capability, then filter to worker domains only.
  const matched = new Map<string, OrchestratorEntry>();
  for (const cap of req.capabilities) {
    for (const entry of findByCapability(cap)) {
      if (matched.has(entry.id)) continue;

      // ── Domain allowlist gate (primary protection) ─────────────────────────
      if (!effectiveDomains.has(entry.domain)) {
        logs.push(`[dispatcher] skipped "${entry.id}" (domain="${entry.domain}" not in worker allowlist)`);
        continue;
      }
      // ── Forbidden-ID gate (defence-in-depth) ──────────────────────────────
      if (FORBIDDEN_DISPATCH_IDS.has(entry.id)) {
        logs.push(`[dispatcher] skipped "${entry.id}" (forbidden dispatch ID)`);
        continue;
      }

      matched.set(entry.id, entry);
    }
  }

  const selected = [...matched.values()].slice(0, MAX);
  logs.push(
    `[dispatcher] capabilities=[${req.capabilities.join(',')}] ` +
    `domains=[${[...effectiveDomains].join(',')}] matched=${matched.size} running=${selected.length}`,
  );

  if (selected.length === 0) {
    logs.push('[dispatcher] no worker orchestrators matched — request handled by pipeline default');
    return Object.freeze({ totalDispatched: 0, succeeded: 0, failed: 0, results: Object.freeze([]), logs: Object.freeze(logs) });
  }

  // Run all matched worker orchestrators in parallel.
  const results = await Promise.all(selected.map((e) => runOne(e, req.input)));

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;
  results.forEach((r) =>
    logs.push(
      `[dispatcher] ${r.success ? '✅' : '❌'} ${r.orchestratorId} (${r.durationMs}ms)` +
      `${r.error ? ' err=' + r.error.slice(0, 80) : ''}`,
    ),
  );

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

  const entries: OrchestratorEntry[] = [];
  for (const id of ids) {
    if (FORBIDDEN_DISPATCH_IDS.has(id)) {
      logs.push(`[dispatcher] skipped "${id}" (forbidden dispatch ID)`);
      continue;
    }
    const entry = findById(id);
    if (!entry) {
      logs.push(`[dispatcher] skipped "${id}" (not found in ORCHESTRATOR_REGISTRY)`);
      continue;
    }
    if (!WORKER_DISPATCH_DOMAINS.has(entry.domain)) {
      logs.push(`[dispatcher] skipped "${id}" (domain="${entry.domain}" not in worker allowlist)`);
      continue;
    }
    entries.push(entry);
  }

  if (entries.length === 0) {
    logs.push('[dispatcher] no valid worker orchestrators found for given IDs');
    return Object.freeze({ totalDispatched: 0, succeeded: 0, failed: 0, results: Object.freeze([]), logs: Object.freeze(logs) });
  }

  const results = await Promise.all(entries.map((e) => runOne(e, input)));
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;
  results.forEach((r) =>
    logs.push(`[dispatcher] ${r.success ? '✅' : '❌'} ${r.orchestratorId} (${r.durationMs}ms)`),
  );

  return Object.freeze({
    totalDispatched: results.length,
    succeeded,
    failed,
    results: Object.freeze(results),
    logs: Object.freeze(logs),
  });
}

export { getRegistryStats, ORCHESTRATOR_REGISTRY };
