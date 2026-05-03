import type { CameraAgentResult, CameraGenerationInput, CameraOrchestratorData } from "./types.js";
import { INITIAL_CAMERA_STATE, updateCameraState } from "./state.js";
import { validateCameraInput } from "./utils/validation.util.js";
import { buildCameraConfig } from "./utils/config-builder.util.js";
import { failureResult } from "./utils/error-normalizer.util.js";
import { handlePermissions } from "./agents/permission-handler.agent.js";
import { setupCamera } from "./agents/camera-setup.agent.js";
import { capturePhoto } from "./agents/photo-capture.agent.js";
import { captureVideo } from "./agents/video-capture.agent.js";
import { pickImageFromGallery } from "./agents/image-picker.agent.js";
import { scanQr } from "./agents/qr-scanner.agent.js";
import { processMedia } from "./agents/media-processor.agent.js";

function runFeatureAgent(input: CameraGenerationInput): Readonly<CameraAgentResult<unknown>> {
  if (input.feature === "photo") {
    return capturePhoto(input);
  }

  if (input.feature === "video") {
    return captureVideo(input);
  }

  if (input.feature === "gallery") {
    return pickImageFromGallery(input);
  }

  return scanQr(input);
}

export function runCameraAgent(
  input: CameraGenerationInput,
): Readonly<CameraAgentResult<CameraOrchestratorData>> {
  let state = INITIAL_CAMERA_STATE;
  const logs: string[] = [];

  try {
    const validationResult = validateCameraInput(input);
    logs.push(...validationResult.logs);
    if (!validationResult.success) {
      return Object.freeze({
        success: false,
        logs: Object.freeze(logs),
        error: validationResult.error,
      });
    }

    const permissionResult = handlePermissions(input);
    logs.push(...permissionResult.logs);
    if (!permissionResult.success || !permissionResult.data) {
      return Object.freeze({
        success: false,
        logs: Object.freeze(logs),
        error: permissionResult.error ?? "Permission workflow failed.",
      });
    }

    state = updateCameraState(state, {
      permissionState: permissionResult.data.camera,
      appendLogs: permissionResult.logs,
    });

    const configResult = buildCameraConfig(input);
    logs.push(...configResult.logs);
    if (!configResult.success || !configResult.data) {
      return Object.freeze({
        success: false,
        logs: Object.freeze(logs),
        error: configResult.error ?? "Config build failed.",
      });
    }

    const cameraSetupResult = setupCamera(input, configResult.data);
    logs.push(...cameraSetupResult.logs);
    if (!cameraSetupResult.success || !cameraSetupResult.data) {
      return Object.freeze({
        success: false,
        logs: Object.freeze(logs),
        error: cameraSetupResult.error ?? "Camera setup failed.",
      });
    }

    state = updateCameraState(state, {
      activeCamera: cameraSetupResult.data.position,
      recordingState: input.feature === "video" ? "recording" : "idle",
      appendLogs: cameraSetupResult.logs,
    });

    const featureResult = runFeatureAgent(input);
    logs.push(...featureResult.logs);
    if (!featureResult.success || !featureResult.data) {
      return Object.freeze({
        success: false,
        logs: Object.freeze(logs),
        error: featureResult.error ?? "Feature execution failed.",
      });
    }

    const mediaResult = processMedia(input.feature, `${input.feature}-${input.cameraPosition}`);
    logs.push(...mediaResult.logs);
    if (!mediaResult.success || !mediaResult.data) {
      return Object.freeze({
        success: false,
        logs: Object.freeze(logs),
        error: mediaResult.error ?? "Media processing failed.",
      });
    }

    const data: CameraOrchestratorData = {
      feature: input.feature,
      permissionState: state.permissionState,
      cameraConfig: cameraSetupResult.data,
      featureData: featureResult.data,
      processedMedia: mediaResult.data,
    };

    return Object.freeze({
      success: true,
      logs: Object.freeze(logs),
      data: Object.freeze(data),
    });
  } catch (error) {
    return failureResult(logs, error);
  }
}
