import type { GeolocationResult, PermissionState } from '../types';

type PermissionMap = {
  ios: Record<PermissionState, string>;
  android: Record<PermissionState, string>;
};

const PLATFORM_PERMISSION_MAP: PermissionMap = Object.freeze({
  ios: Object.freeze({
    granted: 'LOCATION_WHEN_IN_USE',
    denied: 'LOCATION_DENIED',
    blocked: 'LOCATION_BLOCKED',
  }),
  android: Object.freeze({
    granted: 'ACCESS_FINE_LOCATION',
    denied: 'ACCESS_COARSE_LOCATION_DENIED',
    blocked: 'ACCESS_FINE_LOCATION_BLOCKED',
  }),
});

export function mapPermission(
  platform: 'ios' | 'android',
  permission: PermissionState,
): GeolocationResult<{ permissionKey: string }> {
  const permissionKey = PLATFORM_PERMISSION_MAP[platform][permission];
  const result: GeolocationResult<{ permissionKey: string }> = {
    success: true,
    logs: [`Mapped permission for platform ${platform}`],
    data: { permissionKey },
  };

  return Object.freeze(result);
}
