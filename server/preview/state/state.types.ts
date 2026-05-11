export type DeviceType = 'desktop' | 'iphone' | 'ipad' | 'android';
export type DevToolsTabType = 'console' | 'elements' | 'network';
export type GridPageIndex = 0 | 1 | 2 | 3;

export interface PreviewState {
  url: string | null;
  deviceType: DeviceType;
  devToolsTab: DevToolsTabType;
  gridMode: boolean;
  gridPageIndex: GridPageIndex;
  updatedAt: Date;
  sessionId: string;
}

export interface UpdatePreviewStateInput {
  url?: string;
  deviceType?: DeviceType;
  devToolsTab?: DevToolsTabType;
  gridMode?: boolean;
  gridPageIndex?: GridPageIndex;
}

export interface StateUpdateResult {
  ok: boolean;
  state: PreviewState;
  previous?: Partial<PreviewState>;
  error?: string;
}

export interface GetStateResult {
  ok: boolean;
  state: PreviewState | null;
  error?: string;
}

export interface ResetStateResult {
  ok: boolean;
  error?: string;
}

export interface StateServiceConfig {
  broadcastDebounceMs: number;
  sessionTtlMs: number;
}
