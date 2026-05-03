import type { CurrentLocationInput, GeolocationResult, Location } from '../types';

export function formatLocation(input: CurrentLocationInput): GeolocationResult<Location> {
  const timestamp = input.timestamp ?? 0;
  const result: GeolocationResult<Location> = {
    success: true,
    logs: ['Location formatted into standard object'],
    data: {
      latitude: Number(input.latitude),
      longitude: Number(input.longitude),
      accuracy: Number(input.accuracy),
      timestamp,
    },
  };

  return Object.freeze(result);
}
