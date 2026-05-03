import type { CameraAgentResult, CameraGenerationInput } from "../types.js";

export function scanQr(
  input: CameraGenerationInput,
): Readonly<CameraAgentResult<{ payload: string; region: CameraGenerationInput["qrRegion"] }>> {
  return Object.freeze({
    success: true,
    logs: Object.freeze(["QR scanning initialized.", "QR code detected."]),
    data: Object.freeze({
      payload: "HVP-QR-DEMO-PAYLOAD",
      region: input.qrRegion,
    }),
  });
}
