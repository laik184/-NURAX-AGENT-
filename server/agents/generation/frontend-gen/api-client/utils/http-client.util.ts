import type { HttpClientType } from "../types.js";

export function createClientImport(client: HttpClientType): string {
  if (client === "axios") {
    return "import axios from \"axios\";";
  }

  return "// Uses global fetch API";
}

export function createClientInstance(client: HttpClientType, baseUrlVariable: string): string {
  if (client === "axios") {
    return `const api = axios.create({ baseURL: ${baseUrlVariable} });`;
  }

  return "";
}
