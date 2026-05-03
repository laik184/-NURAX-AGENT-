export type PermissionState = 'granted' | 'denied' | 'blocked';
export type AccuracyMode = 'high' | 'balanced' | 'low';

export type Location = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export type PermissionStatus = {
  status: PermissionState;
};

export type GeolocationResult<TData = unknown> = {
  success: boolean;
  logs: string[];
  error?: string;
  data?: TData;
};

export type SetupInput = {
  platform: 'ios' | 'android';
  highAccuracy: boolean;
  timeoutMs: number;
};

export type CurrentLocationInput = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp?: number;
};

export type WatcherInput = {
  intervalMs: number;
  minDistanceMeters: number;
  samples: ReadonlyArray<CurrentLocationInput>;
};

export type GeocodingInput = {
  latitude: number;
  longitude: number;
};

export type AccuracyOptimizationInput = {
  batteryLevel: number;
  desiredMode?: AccuracyMode;
};

export type OrchestratorInput = {
  platform: 'ios' | 'android';
  permission: PermissionState;
  setup: SetupInput;
  location?: CurrentLocationInput;
  watcher?: WatcherInput;
  geocoding?: GeocodingInput;
  optimize?: AccuracyOptimizationInput;
};

export type TrackingPoint = Location & {
  distanceFromPreviousMeters: number;
};
