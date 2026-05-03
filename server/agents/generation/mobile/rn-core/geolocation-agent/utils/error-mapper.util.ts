import type { GeolocationResult } from '../types';

const ERROR_MAP: Record<string, string> = Object.freeze({
  PERMISSION_DENIED: 'User denied geolocation permission',
  PERMISSION_BLOCKED: 'Geolocation permission is blocked at system level',
  TIMEOUT: 'Location request timed out',
  INVALID_COORDINATES: 'Coordinates are outside valid latitude/longitude bounds',
  WATCHER_INACTIVE: 'Location watcher is not active',
  UNKNOWN: 'Unknown geolocation error',
});

export function mapError(code: string): GeolocationResult<{ code: string; message: string }> {
  const normalizedCode = ERROR_MAP[code] ? code : 'UNKNOWN';
  const result: GeolocationResult<{ code: string; message: string }> = {
    success: false,
    logs: ['Mapped geolocation error code'],
    error: normalizedCode,
    data: {
      code: normalizedCode,
      message: ERROR_MAP[normalizedCode],
    },
  };

  return Object.freeze(result);
}
