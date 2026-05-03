import type { CameraAgentState, PermissionStatus, CameraPosition } from "./types.js";

export const INITIAL_CAMERA_STATE: Readonly<CameraAgentState> = Object.freeze({
  permissionState: "denied",
  activeCamera: null,
  recordingState: "idle",
  logs: Object.freeze([]),
});

export interface CameraStatePatch {
  readonly permissionState?: PermissionStatus;
  readonly activeCamera?: CameraPosition | null;
  readonly recordingState?: "idle" | "recording";
  readonly appendLogs?: readonly string[];
}

export function updateCameraState(
  current: Readonly<CameraAgentState>,
  patch: CameraStatePatch,
): Readonly<CameraAgentState> {
  return Object.freeze({
    permissionState: patch.permissionState ?? current.permissionState,
    activeCamera:
      patch.activeCamera === undefined ? current.activeCamera : patch.activeCamera,
    recordingState: patch.recordingState ?? current.recordingState,
    logs: Object.freeze([...(current.logs ?? []), ...(patch.appendLogs ?? [])]),
  });
}
