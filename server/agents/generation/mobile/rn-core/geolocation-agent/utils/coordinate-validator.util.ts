import type { GeolocationResult } from '../types';

export function validateCoordinates(
  latitude: number,
  longitude: number,
): GeolocationResult<{ latitude: number; longitude: number }> {
  const isValidLatitude = latitude >= -90 && latitude <= 90;
  const isValidLongitude = longitude >= -180 && longitude <= 180;

  if (!isValidLatitude || !isValidLongitude) {
    return Object.freeze({
      success: false,
      logs: ['Coordinate validation failed'],
      error: 'INVALID_COORDINATES',
    });
  }

  return Object.freeze({
    success: true,
    logs: ['Coordinate validation passed'],
    data: { latitude, longitude },
  });
}
