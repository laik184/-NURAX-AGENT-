import type { CurrentLocationInput, GeolocationResult, Location } from '../types';
import { validateCoordinates } from '../utils/coordinate-validator.util';
import { mapError } from '../utils/error-mapper.util';
import { formatLocation } from '../utils/location-format.util';

export function runCurrentLocationAgent(input: {
  permission: 'granted' | 'denied' | 'blocked';
  location: CurrentLocationInput;
  timeoutMs: number;
  elapsedMs: number;
}): GeolocationResult<Location> {
  if (input.permission !== 'granted') {
    const mapped = mapError('PERMISSION_DENIED');
    return Object.freeze({
      success: false,
      logs: ['Current location fetch blocked by permission state'],
      error: mapped.error,
    });
  }

  if (input.elapsedMs > input.timeoutMs) {
    const mapped = mapError('TIMEOUT');
    return Object.freeze({
      success: false,
      logs: ['Current location fetch exceeded timeout'],
      error: mapped.error,
    });
  }

  const coordinateCheck = validateCoordinates(input.location.latitude, input.location.longitude);
  if (!coordinateCheck.success) {
    const mapped = mapError('INVALID_COORDINATES');
    return Object.freeze({
      success: false,
      logs: ['Current location has invalid coordinate values'],
      error: mapped.error,
    });
  }

  const formatted = formatLocation(input.location);
  return Object.freeze({
    success: true,
    logs: ['Current location fetched successfully'],
    data: formatted.data,
  });
}
