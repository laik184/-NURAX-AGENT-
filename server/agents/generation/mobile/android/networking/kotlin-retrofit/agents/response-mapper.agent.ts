import type { ResponseModel } from "../types.js";
import { parseJson } from "../utils/json-parser.util.js";

export function mapResponseToModel<T>(payload: string, statusCode: number): ResponseModel<T> {
  const parsed = parseJson<T>(payload);

  return Object.freeze({
    data: parsed,
    statusCode,
    headers: Object.freeze({}),
    raw: payload,
  });
}
