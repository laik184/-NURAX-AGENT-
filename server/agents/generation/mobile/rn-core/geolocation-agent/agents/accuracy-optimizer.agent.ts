import type { AccuracyMode, AccuracyOptimizationInput, GeolocationResult } from '../types';

function resolveMode(input: AccuracyOptimizationInput): AccuracyMode {
  if (input.desiredMode) {
    return input.desiredMode;
  }

  if (input.batteryLevel <= 20) {
    return 'low';
  }

  if (input.batteryLevel <= 60) {
    return 'balanced';
  }

  return 'high';
}

export function runAccuracyOptimizerAgent(
  input: AccuracyOptimizationInput,
): GeolocationResult<{
  mode: AccuracyMode;
  config: { enableHighAccuracy: boolean; distanceFilter: number; updateIntervalMs: number };
}> {
  const mode = resolveMode(input);

  const profileByMode: Record<AccuracyMode, { enableHighAccuracy: boolean; distanceFilter: number; updateIntervalMs: number }> = {
    high: { enableHighAccuracy: true, distanceFilter: 5, updateIntervalMs: 1000 },
    balanced: { enableHighAccuracy: true, distanceFilter: 20, updateIntervalMs: 4000 },
    low: { enableHighAccuracy: false, distanceFilter: 60, updateIntervalMs: 10000 },
  };

  return Object.freeze({
    success: true,
    logs: ['Accuracy profile optimized'],
    data: {
      mode,
      config: profileByMode[mode],
    },
  });
}
