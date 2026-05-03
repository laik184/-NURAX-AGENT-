import type { GeolocationResult, PermissionState } from '../types';
import { mapError } from '../utils/error-mapper.util';
import { mapPermission } from '../utils/permission-map.util';

export function runPermissionHandlerAgent(input: {
  platform: 'ios' | 'android';
  permission: PermissionState;
}): GeolocationResult<{ status: PermissionState; permissionKey: string; fallbackRequired: boolean }> {
  const permissionResult = mapPermission(input.platform, input.permission);
  if (!permissionResult.success || !permissionResult.data) {
    return Object.freeze({
      success: false,
      logs: ['Permission handling failed while mapping permission'],
      error: permissionResult.error ?? 'UNKNOWN',
    });
  }

  if (input.permission === 'granted') {
    const grantedResult: GeolocationResult<{ status: PermissionState; permissionKey: string; fallbackRequired: boolean }> = {
      success: true,
      logs: ['Permission granted'],
      data: {
        status: 'granted',
        permissionKey: permissionResult.data.permissionKey,
        fallbackRequired: false,
      },
    };

    return Object.freeze(grantedResult);
  }

  const mappedError = mapError(input.permission === 'blocked' ? 'PERMISSION_BLOCKED' : 'PERMISSION_DENIED');
  const deniedResult: GeolocationResult<{ status: PermissionState; permissionKey: string; fallbackRequired: boolean }> = {
    success: false,
    logs: ['Permission unavailable; fallback required'],
    error: mappedError.error,
    data: {
      status: input.permission,
      permissionKey: permissionResult.data.permissionKey,
      fallbackRequired: true,
    },
  };

  return Object.freeze(deniedResult);
}
