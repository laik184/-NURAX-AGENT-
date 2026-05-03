import { writeStorage, type StorageSnapshot } from "../utils/storage.util.js";

export interface InstallTrackerOutput {
  readonly accepted: boolean;
  readonly dismissed: boolean;
  readonly conversionRate: number;
  readonly storage: StorageSnapshot;
  readonly logs: readonly string[];
}

export function trackInstallResultAgent(input: {
  readonly outcome: "accepted" | "dismissed" | "ignored";
  readonly impressions: number;
  readonly acceptedTotal: number;
  readonly storage: StorageSnapshot;
}): InstallTrackerOutput {
  const accepted = input.outcome === "accepted";
  const dismissed = input.outcome === "dismissed";

  const nextImpressions = input.impressions + 1;
  const nextAccepted = input.acceptedTotal + (accepted ? 1 : 0);
  const conversionRate = nextAccepted / nextImpressions;

  const serialized = JSON.stringify(Object.freeze({
    impressions: nextImpressions,
    accepted: nextAccepted,
    outcome: input.outcome,
    conversionRate,
  }));

  const stored = writeStorage(input.storage, "pwa.install.metrics", serialized);

  return Object.freeze({
    accepted,
    dismissed,
    conversionRate,
    storage: stored.snapshot,
    logs: Object.freeze([
      `install-tracker: outcome=${input.outcome} conversionRate=${conversionRate.toFixed(2)}`,
    ]),
  });
}
