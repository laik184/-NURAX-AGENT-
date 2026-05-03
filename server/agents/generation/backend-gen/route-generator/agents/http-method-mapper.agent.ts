import type { HttpMethod } from "../types";

const supportedMethods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export const mapHttpMethod = (method: string): HttpMethod => {
  const normalized = method.trim().toUpperCase() as HttpMethod;

  if (supportedMethods.includes(normalized)) {
    return normalized;
  }

  throw new Error(`Unsupported HTTP method: ${method}`);
};
