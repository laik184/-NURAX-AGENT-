import type {
  DiscoveryInput,
  DiscoverySnapshot,
  SourceSummary,
  RawDiscoveryResult,
  SourceKind,
} from "./types.js";
import { EMPTY_BY_KIND, ALL_KINDS } from "./types.js";

import { discoverAgents }       from "./agents/agent-discovery.agent.js";
import { discoverRuntimes }     from "./agents/runtime-discovery.agent.js";
import { discoverIntegrations } from "./agents/integration-discovery.agent.js";
import { discoverDeployments }  from "./agents/deployment-discovery.agent.js";
import { discoverLanguages }    from "./agents/language-discovery.agent.js";

import {
  createSession,
  advanceStage,
  completeSession,
  failSession,
  storeRawResult,
  storeSourceSummary,
  addSnapshot,
  getLastSnapshot,
  getSnapshotHistory,
  clearAll,
} from "./state.js";

export { getLastSnapshot, getSnapshotHistory, clearAll };

let snapshotCounter = 0;

function nextSnapshotId(): string {
  snapshotCounter += 1;
  return `dss-${snapshotCounter}-${Date.now()}`;
}

export function resetCounter(): void {
  snapshotCounter = 0;
}

function isValidInput(input: unknown): input is DiscoveryInput {
  if (!input || typeof input !== "object") return false;
  const i = input as Record<string, unknown>;
  return Array.isArray(i["sources"]);
}

function buildSourceSummary(input: DiscoveryInput): SourceSummary {
  const counts: Record<string, number> = { ...EMPTY_BY_KIND };
  for (const source of input.sources) {
    if (ALL_KINDS.includes(source.kind as SourceKind)) {
      counts[source.kind] = (counts[source.kind] ?? 0) + 1;
    }
  }
  const summary: SourceSummary = Object.freeze({
    totalSources: input.sources.length,
    byKind:       Object.freeze(counts) as Readonly<Record<SourceKind, number>>,
    discoveredAt: Date.now(),
  });
  return summary;
}

function buildEmptySnapshot(reason: string): DiscoverySnapshot {
  const now = Date.now();
  return Object.freeze({
    snapshotId:      nextSnapshotId(),
    discoveredAt:    now,
    agents:          Object.freeze([]),
    runtimes:        Object.freeze([]),
    integrations:    Object.freeze([]),
    deployments:     Object.freeze([]),
    languages:       Object.freeze([]),
    sourceSummary:   Object.freeze({
      totalSources: 0,
      byKind:       Object.freeze({ ...EMPTY_BY_KIND }),
      discoveredAt: now,
    }),
    totalDiscovered: 0,
    summary:         reason,
  });
}

export function runDiscovery(input: DiscoveryInput): DiscoverySnapshot {
  if (!isValidInput(input)) {
    const snap = buildEmptySnapshot("Invalid input: cannot perform capability discovery.");
    addSnapshot(snap);
    return snap;
  }

  const context = input.context ?? "default";
  const session = createSession(context);
  const sources = input.sources;

  try {
    const sourceSummary = buildSourceSummary(input);
    storeSourceSummary(sourceSummary);

    advanceStage("AGENTS");
    const agents       = discoverAgents(sources);

    advanceStage("RUNTIMES");
    const runtimes     = discoverRuntimes(sources);

    advanceStage("INTEGRATIONS");
    const integrations = discoverIntegrations(sources);

    advanceStage("DEPLOYMENTS");
    const deployments  = discoverDeployments(sources);

    advanceStage("LANGUAGES");
    const languages    = discoverLanguages(sources);

    advanceStage("MERGING");
    const raw: RawDiscoveryResult = Object.freeze({
      agents,
      runtimes,
      integrations,
      deployments,
      languages,
      capturedAt: Date.now(),
    });
    storeRawResult(raw);

    const totalDiscovered =
      agents.length + runtimes.length + integrations.length +
      deployments.length + languages.length;

    const parts: string[] = [];
    if (agents.length       > 0) parts.push(`${agents.length} agent(s)`);
    if (runtimes.length     > 0) parts.push(`${runtimes.length} runtime(s)`);
    if (integrations.length > 0) parts.push(`${integrations.length} integration(s)`);
    if (deployments.length  > 0) parts.push(`${deployments.length} deployment(s)`);
    if (languages.length    > 0) parts.push(`${languages.length} language(s)`);
    const summary = parts.length > 0
      ? `Discovered ${totalDiscovered} capability item(s): ${parts.join(", ")}.`
      : "No capability items discovered.";

    const snapshot: DiscoverySnapshot = Object.freeze({
      snapshotId:     nextSnapshotId(),
      discoveredAt:   Date.now(),
      agents,
      runtimes,
      integrations,
      deployments,
      languages,
      sourceSummary,
      totalDiscovered,
      summary,
    });

    completeSession();
    addSnapshot(snapshot);
    return snapshot;

  } catch {
    failSession();
    const empty = buildEmptySnapshot(`Discovery failed during session ${session.sessionId}.`);
    addSnapshot(empty);
    return empty;
  }
}

export function runMany(
  inputs: readonly DiscoveryInput[],
): readonly DiscoverySnapshot[] {
  if (!Array.isArray(inputs)) return Object.freeze([]);
  return Object.freeze(inputs.map((i) => runDiscovery(i)));
}
