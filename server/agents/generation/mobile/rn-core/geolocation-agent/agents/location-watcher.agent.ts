import type { GeolocationResult, Location, TrackingPoint, WatcherInput } from '../types';
import { validateCoordinates } from '../utils/coordinate-validator.util';
import { formatLocation } from '../utils/location-format.util';

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMeters(a: Location, b: Location): number {
  const earthRadiusM = 6371000;
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

export function runLocationWatcherAgent(input: {
  active: boolean;
  watcher: WatcherInput;
}): GeolocationResult<{ intervalMs: number; tracking: ReadonlyArray<TrackingPoint>; stopped: boolean }> {
  if (!input.active) {
    return Object.freeze({
      success: false,
      logs: ['Watcher cannot start when tracking is inactive'],
      error: 'WATCHER_INACTIVE',
    });
  }

  const accepted: TrackingPoint[] = [];
  let previous: Location | null = null;

  for (const sample of input.watcher.samples) {
    const valid = validateCoordinates(sample.latitude, sample.longitude);
    if (!valid.success) {
      continue;
    }

    const formatted = formatLocation(sample);
    if (!formatted.data) {
      continue;
    }

    if (!previous) {
      accepted.push({ ...formatted.data, distanceFromPreviousMeters: 0 });
      previous = formatted.data;
      continue;
    }

    const dist = distanceMeters(previous, formatted.data);
    if (dist >= input.watcher.minDistanceMeters) {
      accepted.push({ ...formatted.data, distanceFromPreviousMeters: Number(dist.toFixed(2)) });
      previous = formatted.data;
    }
  }

  return Object.freeze({
    success: true,
    logs: ['Location watcher processed samples'],
    data: {
      intervalMs: input.watcher.intervalMs,
      tracking: Object.freeze(accepted.map((point) => Object.freeze(point))),
      stopped: false,
    },
  });
}

export function stopLocationWatcherAgent(active: boolean): GeolocationResult<{ stopped: boolean }> {
  return Object.freeze({
    success: true,
    logs: [active ? 'Watcher stopped' : 'Watcher already inactive'],
    data: { stopped: true },
  });
}
