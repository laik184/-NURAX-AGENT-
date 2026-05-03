import type { ResponseModel } from "../types.js";
import { buildDecoderFactory } from "../utils/json-decoder.util.js";

export function buildResponseParser(models: readonly ResponseModel[]): string {
  const modelComments = models.map((model) => `// ${model.endpointName} -> ${model.responseType}`).join("\n");

  return [
    "import Foundation",
    "",
    "struct ResponseParser {",
    `    ${buildDecoderFactory().replace(/\n/g, "\n    ")}`,
    "",
    modelComments,
    "    func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {",
    "        do {",
    "            return try decoder.decode(type, from: data)",
    "        } catch {",
    "            throw NetworkError.decodingError(error)",
    "        }",
    "    }",
    "}",
  ].join("\n");
}
