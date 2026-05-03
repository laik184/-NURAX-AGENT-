export function buildDecoderFactory(): string {
  return [
    "private let decoder: JSONDecoder = {",
    "    let decoder = JSONDecoder()",
    "    decoder.keyDecodingStrategy = .convertFromSnakeCase",
    "    return decoder",
    "}()",
  ].join("\n");
}
