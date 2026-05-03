import type { GeocodingInput, GeolocationResult } from '../types';
import { validateCoordinates } from '../utils/coordinate-validator.util';
import { mapError } from '../utils/error-mapper.util';

export function runGeocodingAgent(
  input: GeocodingInput,
): GeolocationResult<{ provider: 'external-api-ready'; formattedAddress: string; components: Record<string, string> }> {
  const validation = validateCoordinates(input.latitude, input.longitude);
  if (!validation.success) {
    const mapped = mapError('INVALID_COORDINATES');
    return Object.freeze({
      success: false,
      logs: ['Reverse geocoding blocked by invalid coordinates'],
      error: mapped.error,
    });
  }

  const latHemisphere = input.latitude >= 0 ? 'N' : 'S';
  const lngHemisphere = input.longitude >= 0 ? 'E' : 'W';
  const normalizedAddress = `Lat ${Math.abs(input.latitude).toFixed(4)}°${latHemisphere}, Lng ${Math.abs(input.longitude).toFixed(4)}°${lngHemisphere}`;

  const result: GeolocationResult<{ provider: 'external-api-ready'; formattedAddress: string; components: Record<string, string> }> = {
    success: true,
    logs: ['Reverse geocoding payload generated'],
    data: {
      provider: 'external-api-ready',
      formattedAddress: normalizedAddress,
      components: {
        locality: 'Unknown Locality',
        region: 'Unknown Region',
        country: 'Unknown Country',
      },
    },
  };

  return Object.freeze(result);
}

