# Geolocation Agent Module (React Native)

## 1) Module Overview
Ye module React Native mobile apps ke liye GPS handling karta hai. Isme permission flow, location setup, current coordinate fetch, watcher tracking, reverse geocoding payload, aur battery-vs-accuracy optimization included hai.

## 2) Flow
`permission-handler → location-setup → current-location / location-watcher → accuracy-optimizer`

- `getCurrentLocation()` path:
  1. Permission resolve
  2. Setup init
  3. Single coordinate fetch
  4. Accuracy profile optimization
  5. Optional reverse geocoding payload
- `startTracking()` path:
  1. Permission resolve
  2. Setup init
  3. Watch samples process (interval + distance filter)
  4. Accuracy profile optimization

## 3) File Responsibilities
- `types.ts`: L0 domain contracts and shared types.
- `state.ts`: L0 immutable default state.
- `orchestrator.ts`: L1 thin coordination only; agent call sequencing.
- `agents/permission-handler.agent.ts`: platform permission handling + fallback.
- `agents/location-setup.agent.ts`: RN geolocation setup/config contract.
- `agents/current-location.agent.ts`: one-time location fetch result handling.
- `agents/location-watcher.agent.ts`: watch processing + stop behavior.
- `agents/geocoding.agent.ts`: reverse geocoding-ready payload.
- `agents/accuracy-optimizer.agent.ts`: adaptive accuracy profiles.
- `utils/location-format.util.ts`: location normalization.
- `utils/permission-map.util.ts`: platform permission mapping.
- `utils/coordinate-validator.util.ts`: lat/lng range validation.
- `utils/error-mapper.util.ts`: standardized geolocation errors.
- `index.ts`: public exports.

## 4) Import Graph
`orchestrator → agents → utils → types/state`

Rules followed:
- No agent-to-agent imports.
- No cross-module imports.
- L0 files (`types.ts`, `state.ts`) do not import anything.
- Every output follows immutable `Object.freeze(result)` contract.

## 5) Example Usage

```ts
import { getCurrentLocation, startTracking, stopTracking, defaultGeolocationState } from './index';

const singleResult = getCurrentLocation({
  platform: 'android',
  permission: 'granted',
  setup: { platform: 'android', highAccuracy: true, timeoutMs: 12000 },
  location: { latitude: 28.6139, longitude: 77.209, accuracy: 8, timestamp: 1710000000000 },
  geocoding: { latitude: 28.6139, longitude: 77.209 },
  optimize: { batteryLevel: 68 },
});

const trackingResult = startTracking({
  platform: 'ios',
  permission: 'granted',
  setup: { platform: 'ios', highAccuracy: true, timeoutMs: 8000 },
  watcher: {
    intervalMs: 3000,
    minDistanceMeters: 10,
    samples: [
      { latitude: 37.7749, longitude: -122.4194, accuracy: 6, timestamp: 1710000000000 },
      { latitude: 37.775, longitude: -122.4192, accuracy: 6, timestamp: 1710000004000 },
    ],
  },
  optimize: { batteryLevel: 35 },
});

const stopped = stopTracking(defaultGeolocationState);
```
