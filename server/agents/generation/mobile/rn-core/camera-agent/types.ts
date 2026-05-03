export type CameraFeature = "photo" | "video" | "gallery" | "qr";
export type CameraPosition = "front" | "back";
export type PermissionStatus = "granted" | "denied" | "blocked";

export interface CameraAgentResult<TData = unknown> {
  readonly success: boolean;
  readonly logs: readonly string[];
  readonly error?: string;
  readonly data?: TData;
}

export interface CameraGenerationInput {
  readonly feature: CameraFeature;
  readonly cameraPosition: CameraPosition;
  readonly preferHighResolution: boolean;
  readonly includeMicrophone: boolean;
  readonly flash: "off" | "on" | "auto";
  readonly fps: number;
  readonly bitrateKbps: number;
  readonly quality: number;
  readonly sourcePath?: string;
  readonly qrRegion?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface CameraConfig {
  readonly deviceId: string;
  readonly position: CameraPosition;
  readonly resolution: "hd" | "fhd" | "uhd";
  readonly fps: number;
  readonly bitrateKbps: number;
}

export interface CameraAgentState {
  readonly permissionState: PermissionStatus;
  readonly activeCamera: CameraPosition | null;
  readonly recordingState: "idle" | "recording";
  readonly logs: readonly string[];
}

export interface CameraOrchestratorData {
  readonly feature: CameraFeature;
  readonly permissionState: PermissionStatus;
  readonly cameraConfig: CameraConfig;
  readonly featureData: unknown;
  readonly processedMedia?: {
    readonly outputPath: string;
    readonly format: "jpg" | "mp4" | "png";
    readonly sizeKb: number;
  };
}
