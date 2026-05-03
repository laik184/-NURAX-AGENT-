import { runAccuracyOptimizerAgent } from './agents/accuracy-optimizer.agent';
import { runCurrentLocationAgent } from './agents/current-location.agent';
import { runGeocodingAgent } from './agents/geocoding.agent';
import { runLocationSetupAgent } from './agents/location-setup.agent';
import { runLocationWatcherAgent, stopLocationWatcherAgent } from './agents/location-watcher.agent';
import { runPermissionHandlerAgent } from './agents/permission-handler.agent';
import { defaultGeolocationState, type GeolocationState } from './state';
import type { GeolocationResult, OrchestratorInput } from './types';

export function getCurrentLocation(input: OrchestratorInput): GeolocationResult<{
  state: GeolocationState;
  location?: unknown;
  geocoding?: unknown;
  optimizer?: unknown;
}> {
  const logs: string[] = [];

  const permission = runPermissionHandlerAgent({ platform: input.platform, permission: input.permission });
  logs.push(...permission.logs);
  if (!permission.success || !permission.data) {
    return Object.freeze({ success: false, logs, error: permission.error });
  }

  const setup = runLocationSetupAgent({ ...input.setup, permission: permission.data.status });
  logs.push(...setup.logs);
  if (!setup.success) {
    return Object.freeze({ success: false, logs, error: setup.error });
  }

  if (!input.location) {
    return Object.freeze({ success: false, logs, error: 'MISSING_LOCATION_INPUT' });
  }

  const current = runCurrentLocationAgent({
    permission: permission.data.status,
    location: input.location,
    timeoutMs: input.setup.timeoutMs,
    elapsedMs: 0,
  });
  logs.push(...current.logs);
  if (!current.success) {
    return Object.freeze({ success: false, logs, error: current.error });
  }

  const optimize = runAccuracyOptimizerAgent(input.optimize ?? { batteryLevel: 50 });
  logs.push(...optimize.logs);

  const geo = input.geocoding ? runGeocodingAgent(input.geocoding) : null;
  if (geo) {
    logs.push(...geo.logs);
  }

  const nextState: GeolocationState = Object.freeze({
    trackingActive: false,
    lastKnownLocation: current.data ?? null,
    permissionStatus: permission.data.status,
    accuracyMode: optimize.data?.mode ?? defaultGeolocationState.accuracyMode,
  });

  return Object.freeze({
    success: true,
    logs,
    data: {
      state: nextState,
      location: current.data,
      geocoding: geo?.data,
      optimizer: optimize.data,
    },
  });
}

export function startTracking(input: OrchestratorInput): GeolocationResult<{
  state: GeolocationState;
  tracking?: unknown;
  optimizer?: unknown;
}> {
  const logs: string[] = [];

  const permission = runPermissionHandlerAgent({ platform: input.platform, permission: input.permission });
  logs.push(...permission.logs);
  if (!permission.success || !permission.data) {
    return Object.freeze({ success: false, logs, error: permission.error });
  }

  const setup = runLocationSetupAgent({ ...input.setup, permission: permission.data.status });
  logs.push(...setup.logs);
  if (!setup.success) {
    return Object.freeze({ success: false, logs, error: setup.error });
  }

  if (!input.watcher) {
    return Object.freeze({ success: false, logs, error: 'MISSING_WATCHER_INPUT' });
  }

  const watcher = runLocationWatcherAgent({ active: true, watcher: input.watcher });
  logs.push(...watcher.logs);
  if (!watcher.success) {
    return Object.freeze({ success: false, logs, error: watcher.error });
  }

  const optimize = runAccuracyOptimizerAgent(input.optimize ?? { batteryLevel: 50 });
  logs.push(...optimize.logs);

  const latest = watcher.data?.tracking[watcher.data.tracking.length - 1] ?? null;
  const nextState: GeolocationState = Object.freeze({
    trackingActive: true,
    lastKnownLocation: latest,
    permissionStatus: permission.data.status,
    accuracyMode: optimize.data?.mode ?? defaultGeolocationState.accuracyMode,
  });

  return Object.freeze({
    success: true,
    logs,
    data: {
      state: nextState,
      tracking: watcher.data,
      optimizer: optimize.data,
    },
  });
}

export function stopTracking(currentState: GeolocationState): GeolocationResult<{ state: GeolocationState; stopped: boolean }> {
  const stop = stopLocationWatcherAgent(currentState.trackingActive);
  const nextState: GeolocationState = Object.freeze({
    ...currentState,
    trackingActive: false,
  });

  return Object.freeze({
    success: stop.success,
    logs: stop.logs,
    error: stop.error,
    data: {
      state: nextState,
      stopped: stop.data?.stopped ?? false,
    },
  });
}
