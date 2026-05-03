import type { HttpMethod } from "../types.js";

function toWords(path: string): string[] {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.replace(/[{}:-]/g, " "))
    .flatMap((segment) => segment.split(/\s+/).filter(Boolean));
}

function capitalize(word: string): string {
  if (!word) return "";
  return word[0].toUpperCase() + word.slice(1);
}

export function buildOperationName(path: string, method: HttpMethod): string {
  const prefix = method === "GET" ? "get" : method === "POST" ? "create" : method === "PUT" ? "update" : method === "PATCH" ? "patch" : "delete";
  const words = toWords(path);
  const suffix = words.length ? words.map(capitalize).join("") : "Root";
  return `${prefix}${suffix}`;
}
