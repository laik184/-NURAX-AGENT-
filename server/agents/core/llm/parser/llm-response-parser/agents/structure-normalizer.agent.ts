import type { ErrorInfo, ParsedResponse, ResponseType } from "../types";

interface NormalizeArgs {
  type: ResponseType;
  data: unknown;
  errors: ErrorInfo[];
  logs: string[];
}

export const normalizeParsedStructure = ({
  type,
  data,
  errors,
  logs,
}: NormalizeArgs): ParsedResponse => {
  const normalizedType: ParsedResponse["type"] = type === "unknown" ? "text" : type;

  const output: ParsedResponse = {
    success: errors.length === 0,
    type: normalizedType,
    data,
    ...(errors.length ? { errors } : {}),
    logs,
  };

  return Object.freeze(output);
};
