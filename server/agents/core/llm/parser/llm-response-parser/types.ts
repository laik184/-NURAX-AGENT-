export type ResponseType = "json" | "code" | "text" | "unknown";

export interface ErrorInfo {
  code: string;
  message: string;
  details?: unknown;
}

export interface ParsedResponse {
  success: boolean;
  type: Exclude<ResponseType, "unknown">;
  data: unknown;
  errors?: ErrorInfo[];
  logs: string[];
}

export interface ParseResult {
  rawResponse: string;
  parsedOutput: unknown;
  detectedType: ResponseType;
  errors: ErrorInfo[];
  logs: string[];
  status: "IDLE" | "PROCESSING" | "SUCCESS" | "FAILED";
}
