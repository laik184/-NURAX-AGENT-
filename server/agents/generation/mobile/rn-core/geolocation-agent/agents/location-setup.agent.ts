import type { GeolocationResult, SetupInput } from '../types';
import { mapPermission } from '../utils/permission-map.util';

export function runLocationSetupAgent(
  input: SetupInput & { permission: 'granted' | 'denied' | 'blocked' },
): GeolocationResult<{
  provider: 'react-native-geolocation-service';
  config: { enableHighAccuracy: boolean; timeout: number };
  permissionKey: string;
}> {
  const permissionMapResult = mapPermission(input.platform, input.permission);

  if (!permissionMapResult.success || !permissionMapResult.data) {
    return Object.freeze({
      success: false,
      logs: ['Location setup failed while mapping permission'],
      error: permissionMapResult.error ?? 'UNKNOWN',
    });
  }

  const result: GeolocationResult<{
    provider: 'react-native-geolocation-service';
    config: { enableHighAccuracy: boolean; timeout: number };
    permissionKey: string;
  }> = {
    success: true,
    logs: ['Location setup initialized'],
    data: {
      provider: 'react-native-geolocation-service',
      config: {
        enableHighAccuracy: input.highAccuracy,
        timeout: input.timeoutMs,
      },
      permissionKey: permissionMapResult.data.permissionKey,
    },
  };

  return Object.freeze(result);
}
