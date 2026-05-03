export type GeolocationState = {
  trackingActive: boolean;
  lastKnownLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null;
  permissionStatus: 'granted' | 'denied' | 'blocked';
  accuracyMode: 'high' | 'balanced' | 'low';
};

export const defaultGeolocationState: GeolocationState = Object.freeze({
  trackingActive: false,
  lastKnownLocation: null,
  permissionStatus: 'denied',
  accuracyMode: 'balanced',
});
