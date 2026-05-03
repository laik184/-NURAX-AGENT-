import { AssetDefinition } from '../types.js';

const toAttributes = (asset: AssetDefinition): string => {
  const attrs = [
    `rel="preload"`,
    `href="${asset.href}"`,
    `as="${asset.as}"`,
    asset.type ? `type="${asset.type}"` : '',
    asset.crossOrigin ? `crossorigin="${asset.crossOrigin}"` : '',
    asset.fetchPriority ? `fetchpriority="${asset.fetchPriority}"` : '',
  ].filter(Boolean);

  return attrs.join(' ');
};

export const buildPreloadLinks = (assets: ReadonlyArray<AssetDefinition>): ReadonlyArray<string> =>
  Object.freeze(assets.map((asset) => `<link ${toAttributes(asset)}>`));
