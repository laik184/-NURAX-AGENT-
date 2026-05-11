import { v4 as uuid } from 'uuid';
import type {
  PreviewState, UpdatePreviewStateInput, StateUpdateResult,
  GetStateResult, ResetStateResult, StateServiceConfig,
  DeviceType, DevToolsTabType, GridPageIndex,
} from './state.types.ts';

const DEFAULT_CONFIG: StateServiceConfig = {
  broadcastDebounceMs: 100,
  sessionTtlMs: 30 * 60 * 1000,
};

const DEFAULT_STATE: Omit<PreviewState, 'sessionId' | 'updatedAt'> = {
  url: null,
  deviceType: 'desktop',
  devToolsTab: 'console',
  gridMode: false,
  gridPageIndex: 2,
};

type BroadcastFn = (state: PreviewState) => void;

export class StateService {
  private state: PreviewState;
  private config: StateServiceConfig;
  private broadcastFn?: BroadcastFn;
  private debounceTimer?: ReturnType<typeof setTimeout>;

  constructor(config?: Partial<StateServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createFreshState();
  }

  get(): GetStateResult {
    return { ok: true, state: { ...this.state } };
  }

  update(input: UpdatePreviewStateInput): StateUpdateResult {
    const previous: Partial<PreviewState> = {};
    const next = { ...this.state };

    if (input.url !== undefined) { previous.url = this.state.url; next.url = input.url; }
    if (input.deviceType !== undefined) { previous.deviceType = this.state.deviceType; next.deviceType = input.deviceType; }
    if (input.devToolsTab !== undefined) { previous.devToolsTab = this.state.devToolsTab; next.devToolsTab = input.devToolsTab; }
    if (input.gridMode !== undefined) { previous.gridMode = this.state.gridMode; next.gridMode = input.gridMode; }
    if (input.gridPageIndex !== undefined) { previous.gridPageIndex = this.state.gridPageIndex; next.gridPageIndex = input.gridPageIndex; }

    next.updatedAt = new Date();
    this.state = next;

    this.debouncedBroadcast();
    return { ok: true, state: { ...this.state }, previous };
  }

  reset(): ResetStateResult {
    this.state = this.createFreshState();
    this.debouncedBroadcast();
    return { ok: true };
  }

  setUrl(url: string): StateUpdateResult {
    return this.update({ url });
  }

  setDevice(deviceType: DeviceType): StateUpdateResult {
    return this.update({ deviceType });
  }

  setDevToolsTab(devToolsTab: DevToolsTabType): StateUpdateResult {
    return this.update({ devToolsTab });
  }

  setGridMode(gridMode: boolean, gridPageIndex?: GridPageIndex): StateUpdateResult {
    return this.update({ gridMode, ...(gridPageIndex !== undefined ? { gridPageIndex } : {}) });
  }

  onBroadcast(fn: BroadcastFn): void {
    this.broadcastFn = fn;
  }

  isExpired(): boolean {
    const age = Date.now() - this.state.updatedAt.getTime();
    return age > this.config.sessionTtlMs;
  }

  snapshot(): PreviewState {
    return { ...this.state };
  }

  private createFreshState(): PreviewState {
    return {
      ...DEFAULT_STATE,
      sessionId: uuid(),
      updatedAt: new Date(),
    };
  }

  private debouncedBroadcast(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.broadcastFn?.({ ...this.state });
    }, this.config.broadcastDebounceMs);
  }
}

export const stateService = new StateService();
