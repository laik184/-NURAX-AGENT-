import type { ColorSystem } from "../types.js";

export function buildColorSystem(): ColorSystem {
  return Object.freeze({
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
  });
}
