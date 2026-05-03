import { AppShellInput, AssetDefinition } from '../types.js';
import { buildPreloadLinks } from '../utils/preload-builder.util.js';

const scoreAsset = (asset: AssetDefinition): number => {
  const criticalBoost = asset.critical ? 100 : 0;
  const asWeight =
    asset.as === 'script' ? 60 : asset.as === 'font' ? 45 : asset.as === 'style' ? 40 : asset.as === 'image' ? 25 : 0;
  const fetchPriorityWeight = asset.fetchPriority === 'high' ? 25 : 0;
  return criticalBoost + asWeight + fetchPriorityWeight;
};

const getMaxPreloads = (strategy: AppShellInput['loadingStrategy']): number => {
  if (strategy === 'aggressive') {
    return 6;
  }

  if (strategy === 'conservative') {
    return 3;
  }

  return 4;
};

export const preloadStrategyAgent = (input: AppShellInput): ReadonlyArray<string> => {
  const ordered = [...input.assets].sort((a, b) => scoreAsset(b) - scoreAsset(a));
  const selected = ordered.slice(0, getMaxPreloads(input.loadingStrategy));
  return buildPreloadLinks(selected);
};
