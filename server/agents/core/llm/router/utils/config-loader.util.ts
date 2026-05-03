import type { ProviderConfig } from "../types.js";

export function filterEligibleConfigs(
  configs: readonly ProviderConfig[],
  preferredProviders?: readonly string[],
  excludedProviders?: readonly string[],
): readonly ProviderConfig[] {
  const preferredSet = new Set(preferredProviders ?? []);
  const excludedSet = new Set(excludedProviders ?? []);

  const filtered = configs.filter((config) => {
    if (excludedSet.has(config.provider)) return false;
    if (preferredSet.size === 0) return true;
    return preferredSet.has(config.provider);
  });

  return Object.freeze(filtered);
}
