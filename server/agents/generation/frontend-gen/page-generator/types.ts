export type SupportedFramework = 'react' | 'next' | 'vue';
export type StateManagerType = 'redux' | 'zustand' | 'context' | 'pinia' | 'none';

export interface ComponentSpec {
  readonly name: string;
  readonly type: 'ui' | 'form' | 'list' | 'chart' | 'custom';
  readonly props?: Readonly<Record<string, string>>;
}

export interface LayoutSpec {
  readonly header: string;
  readonly body: string;
  readonly footer: string;
}

export interface PageSpec {
  readonly pageName: string;
  readonly framework: SupportedFramework;
  readonly routePath: string;
  readonly pageType: 'dashboard' | 'detail' | 'form' | 'landing' | 'custom';
  readonly features: readonly string[];
  readonly components: readonly ComponentSpec[];
  readonly stateManager: StateManagerType;
  readonly apiEndpoints: readonly string[];
  readonly seo?: {
    readonly title?: string;
    readonly description?: string;
  };
}

export interface GeneratedFile {
  readonly path: string;
  readonly content: string;
}

export interface PageResult {
  readonly success: boolean;
  readonly pageName: string;
  readonly files: readonly GeneratedFile[];
  readonly logs: readonly string[];
  readonly error?: string;
}

export interface PageGeneratorState {
  pageName: string;
  components: readonly string[];
  routes: readonly string[];
  apiCalls: readonly string[];
  status: 'IDLE' | 'GENERATING' | 'SUCCESS' | 'FAILED';
  logs: readonly string[];
  errors: readonly string[];
}

export interface PageGenerationContext {
  readonly spec: PageSpec;
  layout?: LayoutSpec;
  files: GeneratedFile[];
  components: readonly string[];
  routes: readonly string[];
  apiCalls: readonly string[];
  logs: string[];
}
