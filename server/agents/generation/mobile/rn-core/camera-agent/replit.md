# Camera Agent (HVP)

## 1) Module Overview
This module provides a deterministic, production-grade camera pipeline for React Native generation targets. It enforces strict HVP layering:
- **L0**: Shared contracts (`types.ts`) and state lifecycle (`state.ts`)
- **L1**: Coordination only (`orchestrator.ts`)
- **L2**: Pure business agents (`agents/*.agent.ts`)
- **L3**: Pure helper utilities (`utils/*.util.ts`)

All exported results follow the same immutable contract:

```ts
{
  success: boolean,
  logs: string[],
  error?: string,
  data?: any
}
```

## 2) Folder Structure
```text
camera-agent/
├── orchestrator.ts
├── index.ts
├── types.ts
├── state.ts
├── Replit.md
├── agents/
│   ├── camera-setup.agent.ts
│   ├── permission-handler.agent.ts
│   ├── photo-capture.agent.ts
│   ├── video-capture.agent.ts
│   ├── image-picker.agent.ts
│   ├── qr-scanner.agent.ts
│   └── media-processor.agent.ts
└── utils/
    ├── config-builder.util.ts
    ├── error-normalizer.util.ts
    ├── file-path.util.ts
    └── validation.util.ts
```

## 3) File Responsibilities
- `types.ts`: Immutable type contracts and response shape.
- `state.ts`: Controlled state updates (`updateCameraState`) with frozen outputs.
- `orchestrator.ts`: Calls agents in sequence and merges their outputs.
- `agents/camera-setup.agent.ts`: Camera setup + device/resolution alignment.
- `agents/permission-handler.agent.ts`: Camera/mic permission flow.
- `agents/photo-capture.agent.ts`: Photo capture contract.
- `agents/video-capture.agent.ts`: Start/stop recording contract.
- `agents/image-picker.agent.ts`: Gallery selection and file validation.
- `agents/qr-scanner.agent.ts`: QR scan result contract.
- `agents/media-processor.agent.ts`: Compression/resize/format processing envelope.
- `utils/config-builder.util.ts`: Deterministic camera config creation.
- `utils/error-normalizer.util.ts`: Error normalization and failure result builder.
- `utils/file-path.util.ts`: Safe output path generation.
- `utils/validation.util.ts`: Input validation boundaries.

## 4) Execution Flow (Step-by-Step)
1. User invokes `runCameraAgent(input)`.
2. Orchestrator validates input via `validation.util`.
3. Orchestrator requests permissions via `permission-handler.agent`.
4. Orchestrator builds camera config via `config-builder.util`.
5. Orchestrator initializes camera via `camera-setup.agent`.
6. Orchestrator dispatches selected feature agent (`photo`, `video`, `gallery`, or `qr`).
7. Orchestrator sends output through `media-processor.agent`.
8. Orchestrator returns final immutable response.

## 5) Import Graph (Who Calls Whom)
- `index.ts` → `orchestrator.ts`, `state.ts`, `types.ts`
- `orchestrator.ts` → all `agents/*` + selected `utils/*` + `state.ts`
- `agents/media-processor.agent.ts` → `utils/file-path.util.ts`
- Other `agents/*` do **not** import each other
- `utils/*` do not import any agent

## 6) Example Input / Output
### Input
```ts
{
  feature: "photo",
  cameraPosition: "back",
  preferHighResolution: true,
  includeMicrophone: false,
  flash: "auto",
  fps: 30,
  bitrateKbps: 5000,
  quality: 90
}
```

### Output
```ts
{
  success: true,
  logs: ["Validating camera input.", "Input is valid.", "Permissions requested.", "Required permissions granted.", "Camera config built.", "Initializing react-native-vision-camera for back camera.", "Resolution set to uhd.", "Photo capture requested.", "Photo captured deterministically.", "Media processing started.", "Media processing finished."],
  data: {
    feature: "photo",
    permissionState: "granted",
    cameraConfig: {
      deviceId: "vision-back-uhd",
      position: "back",
      resolution: "uhd",
      fps: 30,
      bitrateKbps: 5000
    },
    featureData: {
      assetId: "photo-back-90",
      flash: "auto",
      focusMode: "auto",
      quality: 90
    },
    processedMedia: {
      outputPath: "/tmp/camera-agent/photo-photo-back.jpg",
      format: "jpg",
      sizeKb: 512
    }
  }
}
```

## 7) Supported Features
- **photo**: capture with flash/focus/quality controls
- **video**: recording with bitrate/fps configuration
- **gallery**: image picker with extension validation
- **QR**: deterministic QR scan payload contract

## 8) Known Limitations
- Native runtime bindings are abstracted; this layer returns deterministic contracts rather than invoking device APIs.
- Permission handling assumes deterministic grants for camera and conditional mic usage.
- QR payload is static for deterministic testing.
- Media processing outputs are simulated metadata envelopes.
