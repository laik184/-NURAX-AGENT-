export interface PerformanceTargets {
  firstPaintMs: number;
  interactiveMs: number;
  maxInitialJsKb: number;
}

export interface RouteDefinition {
  path: string;
  chunkName: string;
  priority: 'critical' | 'deferred';
}

export interface AssetDefinition {
  href: string;
  as: 'script' | 'style' | 'font' | 'image';
  type?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  fetchPriority?: 'high' | 'low' | 'auto';
  critical?: boolean;
}

export interface AppShellInput {
  appName: string;
  lang?: string;
  routes: ReadonlyArray<RouteDefinition>;
  assets: ReadonlyArray<AssetDefinition>;
  loadingStrategy: 'aggressive' | 'balanced' | 'conservative';
  performanceTargets: PerformanceTargets;
}

export interface ShellLayout {
  documentTitle: string;
  lang: string;
  bodyMarkup: string;
  skeletonMarkup: string;
}

export interface HydrationPlan {
  mode: 'islands' | 'selective' | 'full';
  bootstrap: ReadonlyArray<{
    selector: string;
    strategy: 'immediate' | 'idle' | 'visible';
  }>;
  deferredBoundaries: ReadonlyArray<string>;
}

export interface AppShellOutput {
  success: boolean;
  logs: ReadonlyArray<string>;
  data: {
    htmlShell: string;
    criticalCSS: string;
    preloadLinks: ReadonlyArray<string>;
    lazyChunks: ReadonlyArray<{ path: string; importExpression: string }>;
    hydrationPlan: HydrationPlan;
  };
}
